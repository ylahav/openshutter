import { Injectable, Logger } from '@nestjs/common'
import { createHash } from 'crypto'
import mongoose, { Types } from 'mongoose'
import { storageManager } from './storage'
import { resolveOwnerStorageContext } from './storage/owner-storage-context'
import { buildPublicUrl } from './storage/storage-serve-url'

const { ObjectId } = Types

export interface VideoUploadOptions {
  albumId?: string
  title?: string
  description?: string
  uploadedBy?: string
  duration?: number
  dimensions?: { width: number; height: number }
}

export interface VideoUploadResult {
  success: boolean
  video?: any
  error?: string
  skipped?: boolean
  reason?: string
}

@Injectable()
export class VideoUploadService {
  private readonly logger = new Logger(VideoUploadService.name)

  private calculateHash(fileBuffer: Buffer): string {
    return createHash('sha256').update(fileBuffer).digest('hex')
  }

  async uploadVideo(
    fileBuffer: Buffer,
    originalFilename: string,
    mimeType: string,
    options: VideoUploadOptions = {},
  ): Promise<VideoUploadResult> {
    try {
      const db = mongoose.connection.db
      if (!db) {
        throw new Error('Database connection not established')
      }

      await this.ensureVideosCollection(db)

      const hash = this.calculateHash(fileBuffer)
      const fileSize = fileBuffer.length

      // Dedup by hash (mirrors PhotoUploadService semantics).
      const videosCollection = db.collection('videos')
      const existingByHash = await videosCollection.findOne({ hash })
      if (existingByHash) {
        return {
          success: false,
          skipped: true,
          reason: 'Video with same hash already exists',
          error: 'Video with same hash already exists',
        }
      }

      let album: any = null
      let storageProvider = 'local'
      if (options.albumId) {
        try {
          album = await db.collection('albums').findOne({ _id: new ObjectId(options.albumId) })
        } catch {
          album = null
        }
        if (album?.storageProvider) storageProvider = album.storageProvider
      }

      const storageCtx = await resolveOwnerStorageContext(
        album?.createdBy ? String(album.createdBy) : undefined,
      )

      const storageService = await storageManager.getProvider(
        storageProvider as 'local' | 'google-drive' | 'aws-s3' | 'backblaze' | 'wasabi',
        storageCtx,
      )

      const providerCfg = storageService.getConfig?.() ?? {}
      const publicBaseUrl =
        storageProvider === 'backblaze' && typeof providerCfg.publicBaseUrl === 'string'
          ? providerCfg.publicBaseUrl.trim()
          : ''

      const timestamp = Date.now()
      const filename = `${timestamp}-${originalFilename}`
      const albumPath = album?.storagePath || ''

      this.logger.debug(
        `VideoUploadService: uploading ${filename} (${(fileSize / 1024 / 1024).toFixed(2)}MB) to ${albumPath || 'root'} on ${storageProvider}`,
      )

      const uploadResult = await storageService.uploadFile(
        fileBuffer,
        filename,
        mimeType,
        albumPath,
        {
          originalFilename,
          albumId: options.albumId,
        },
      )

      let uploaderObjectId: Types.ObjectId
      if (options.uploadedBy) {
        uploaderObjectId = new ObjectId(options.uploadedBy)
      } else {
        try {
          const systemUser = await db.collection('users').findOne({ username: 'system' })
          uploaderObjectId = systemUser?._id || new ObjectId('000000000000000000000000')
        } catch {
          uploaderObjectId = new ObjectId('000000000000000000000000')
        }
      }

      const videoData = {
        title: { en: options.title || originalFilename },
        description: { en: options.description || '' },
        filename,
        originalFilename,
        mimeType,
        size: fileSize,
        hash,
        duration: options.duration,
        dimensions: options.dimensions,
        storage: {
          provider: storageProvider,
          fileId: uploadResult.fileId,
          url: buildPublicUrl({
            providerId: storageProvider,
            key: uploadResult.path,
            publicBaseUrl,
            hash,
            ownerUserId: storageCtx?.ownerUserId,
          }),
          path: uploadResult.path,
          folderId: uploadResult.folderId,
          ...(storageCtx ? { storageOwnerId: storageCtx.ownerUserId } : {}),
        },
        albumId: options.albumId ? new ObjectId(options.albumId) : null,
        isPublished: true,
        uploadedBy: uploaderObjectId,
        uploadedAt: new Date(),
        updatedAt: new Date(),
      }

      const insertResult = await videosCollection.insertOne(videoData)
      const savedVideo = { _id: insertResult.insertedId, ...videoData }

      if (options.albumId) {
        try {
          await db
            .collection('albums')
            .updateOne({ _id: new ObjectId(options.albumId) }, { $inc: { videoCount: 1 } })
        } catch (e) {
          this.logger.warn(
            `VideoUploadService: failed to increment album videoCount: ${e instanceof Error ? e.message : String(e)}`,
          )
        }
      }

      return { success: true, video: savedVideo }
    } catch (error) {
      this.logger.error(
        `VideoUploadService: upload failed: ${error instanceof Error ? error.message : String(error)}`,
      )
      return {
        success: false,
        error: error instanceof Error ? error.message : 'Upload failed',
      }
    }
  }

  private async ensureVideosCollection(db: any): Promise<void> {
    try {
      const existing = await db.listCollections({ name: 'videos' }).toArray()
      if (existing.length === 0) {
        await db.createCollection('videos')
        try {
          await db.collection('videos').createIndex({ albumId: 1 })
          await db.collection('videos').createIndex({ uploadedBy: 1 })
          await db.collection('videos').createIndex({ isPublished: 1 })
          await db.collection('videos').createIndex({ uploadedAt: -1 })
          await db.collection('videos').createIndex({ filename: 1 }, { unique: true })
          await db.collection('videos').createIndex({ hash: 1 })
          await db.collection('videos').createIndex({ originalFilename: 1, size: 1 })
        } catch (e) {
          this.logger.warn(
            `VideoUploadService: index creation warning: ${e instanceof Error ? e.message : String(e)}`,
          )
        }
      }
    } catch (e) {
      this.logger.warn(
        `VideoUploadService: failed to ensure videos collection: ${e instanceof Error ? e.message : String(e)}`,
      )
    }
  }
}
