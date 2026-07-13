import { Injectable, Logger, OnModuleInit, OnModuleDestroy } from '@nestjs/common'
import { ConfigService } from '@nestjs/config'
import mongoose from 'mongoose'
import { PhotoUploadService } from './photo-upload'

/**
 * Background worker that processes pending photo docs off the HTTP request path.
 *
 * Bulk uploads (100+ photos) used to run EXIF/thumbnails/dimensions inline inside
 * `finalizePresignedUpload`, which saturated the backend and let requests linger
 * past Cloudflare's ~100s edge timeout → 504s across the whole batch. Now finalize
 * inserts a doc with `processingStatus: 'pending'` and returns immediately; this
 * worker picks it up and runs the heavy pipeline with a bounded concurrency.
 *
 * Uses MongoDB itself as the queue — no Redis/BullMQ needed for a single-tenant
 * self-hosted app. Atomic `findOneAndUpdate` claim is safe if we ever run
 * multiple backend processes.
 */
@Injectable()
export class PhotoProcessingWorker implements OnModuleInit, OnModuleDestroy {
  private readonly logger = new Logger(PhotoProcessingWorker.name)
  /** Max photos processed concurrently. Configurable via PHOTO_PROCESSING_CONCURRENCY. */
  private readonly concurrency: number
  /** Poll interval in ms. Kept short so uploads feel responsive; DB load is cheap. */
  private readonly pollIntervalMs = 2000
  /** After this long in 'processing' a doc is assumed abandoned and bumped back to 'pending'. */
  private readonly stuckAfterMs = 10 * 60 * 1000
  private timer: NodeJS.Timeout | null = null
  private inFlight = 0
  private shuttingDown = false

  constructor(
    private readonly configService: ConfigService,
    private readonly photoUploadService: PhotoUploadService,
  ) {
    const raw = this.configService.get<string>('PHOTO_PROCESSING_CONCURRENCY')?.trim()
    const n = raw ? Number(raw) : NaN
    this.concurrency = Number.isFinite(n) && n > 0 ? Math.floor(n) : 4
  }

  async onModuleInit(): Promise<void> {
    // Crash recovery: any doc left as 'processing' from a previous run gets
    // bumped back to 'pending' so we'll retry it. Same for the stuck reaper —
    // one query at startup handles both.
    try {
      const db = mongoose.connection.db
      if (db) {
        const result = await db
          .collection('photos')
          .updateMany({ processingStatus: 'processing' }, { $set: { processingStatus: 'pending' } })
        if (result.modifiedCount > 0) {
          this.logger.log(
            `Recovered ${result.modifiedCount} photo(s) stuck in 'processing' from previous run`,
          )
        }
      }
    } catch (e) {
      this.logger.warn(
        `Startup recovery failed: ${e instanceof Error ? e.message : String(e)}`,
      )
    }

    this.logger.log(
      `PhotoProcessingWorker started (concurrency=${this.concurrency}, poll=${this.pollIntervalMs}ms)`,
    )
    this.scheduleNextTick()
  }

  async onModuleDestroy(): Promise<void> {
    this.shuttingDown = true
    if (this.timer) {
      clearTimeout(this.timer)
      this.timer = null
    }
    // Best-effort drain: give in-flight jobs up to 30s to finish before exit.
    const deadline = Date.now() + 30_000
    while (this.inFlight > 0 && Date.now() < deadline) {
      await new Promise((r) => setTimeout(r, 100))
    }
    if (this.inFlight > 0) {
      this.logger.warn(`Shutdown with ${this.inFlight} job(s) still in flight`)
    }
  }

  private scheduleNextTick(): void {
    if (this.shuttingDown) return
    this.timer = setTimeout(() => {
      void this.tick()
    }, this.pollIntervalMs)
  }

  private async tick(): Promise<void> {
    if (this.shuttingDown) return
    try {
      // Reap docs that have been in 'processing' too long (backend crash / abandoned job).
      await this.reapStuck()

      // Fill available slots.
      await this.fillSlots()
    } catch (e) {
      this.logger.error(
        `Tick failed: ${e instanceof Error ? e.message : String(e)}`,
      )
    } finally {
      this.scheduleNextTick()
    }
  }

  /**
   * Claim and start jobs until slots are full or nothing is pending.
   * Called both from the periodic tick and immediately after each job finishes,
   * so a completed 1.5s job doesn't sit idle for the 2s poll interval.
   */
  private async fillSlots(): Promise<void> {
    while (!this.shuttingDown && this.inFlight < this.concurrency) {
      const claimed = await this.claimOne()
      if (!claimed) break
      this.inFlight++
      void this.runJob(String(claimed._id))
        .catch((e) => {
          this.logger.error(
            `Job for ${claimed._id} threw: ${e instanceof Error ? e.message : String(e)}`,
          )
        })
        .finally(() => {
          this.inFlight--
          // Chain the next job right away — poll interval is a fallback for new
          // inserts, not the throughput regulator.
          if (!this.shuttingDown) {
            void this.fillSlots().catch((e) => {
              this.logger.error(
                `fillSlots after completion failed: ${e instanceof Error ? e.message : String(e)}`,
              )
            })
          }
        })
    }
  }

  private async reapStuck(): Promise<void> {
    const db = mongoose.connection.db
    if (!db) return
    const cutoff = new Date(Date.now() - this.stuckAfterMs)
    const result = await db.collection('photos').updateMany(
      {
        processingStatus: 'processing',
        processingStartedAt: { $lt: cutoff },
      },
      { $set: { processingStatus: 'pending' } },
    )
    if (result.modifiedCount > 0) {
      this.logger.warn(`Reaped ${result.modifiedCount} stuck job(s) back to 'pending'`)
    }
  }

  /** Atomically claim one pending doc → 'processing'. Returns the doc or null. */
  private async claimOne(): Promise<{ _id: unknown } | null> {
    const db = mongoose.connection.db
    if (!db) return null
    const result = await db.collection('photos').findOneAndUpdate(
      { processingStatus: 'pending' },
      { $set: { processingStatus: 'processing', processingStartedAt: new Date() } },
      { projection: { _id: 1 }, returnDocument: 'after' },
    )
    // Driver typings differ across versions — result may be the doc or {value: doc}.
    const doc = (result as any)?.value ?? result
    return doc && doc._id ? { _id: doc._id } : null
  }

  private async runJob(photoId: string): Promise<void> {
    const startedAt = Date.now()
    try {
      await this.photoUploadService.processPhotoAfterUpload(photoId)
      this.logger.debug(
        `Processed photo ${photoId} in ${Date.now() - startedAt}ms`,
      )
    } catch (e) {
      // processPhotoAfterUpload already marks the doc as 'failed' on catch.
      this.logger.error(
        `Photo ${photoId} failed after ${Date.now() - startedAt}ms: ${e instanceof Error ? e.message : String(e)}`,
      )
    }
  }
}
