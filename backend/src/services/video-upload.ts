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

export interface PresignedInitOptions {
  albumId: string
  originalFilename: string
  mimeType: string
  size: number
}

export interface PresignedInitResult {
  uploadUrl: string
  key: string
  storageProvider: string
  expiresAt: Date
  requiredHeaders?: Record<string, string>
}

export interface PresignedFinalizeOptions {
  key: string
  albumId: string
  originalFilename: string
  mimeType: string
  size: number
  duration?: number
  dimensions?: { width: number; height: number }
  uploadedBy?: string
}

@Injectable()
export class VideoUploadService {
  private readonly logger = new Logger(VideoUploadService.name)

  private calculateHash(fileBuffer: Buffer): string {
    return createHash('sha256').update(fileBuffer).digest('hex')
  }

  /**
   * Presigned upload init: mint a URL the browser can PUT directly to storage.
   * Bypasses Cloudflare/nginx/SvelteKit body limits for large videos.
   */
  async initPresignedUpload(options: PresignedInitOptions): Promise<
    | { success: true; data: PresignedInitResult }
    | { success: false; error: string }
  > {
    try {
      const db = mongoose.connection.db
      if (!db) throw new Error('Database connection not established')

      const album = await db.collection('albums').findOne({ _id: new ObjectId(options.albumId) })
      if (!album) return { success: false, error: 'Album not found' }

      const storageProvider = (album.storageProvider as string) || 'local'
      const storageCtx = await resolveOwnerStorageContext(
        album.createdBy ? String(album.createdBy) : undefined,
      )
      const storageService = await storageManager.getProvider(
        storageProvider as 'local' | 'google-drive' | 'aws-s3' | 'backblaze' | 'wasabi',
        storageCtx,
      )

      if (typeof storageService.getPresignedUploadUrl !== 'function') {
        return {
          success: false,
          error: `Storage provider ${storageProvider} does not support direct upload. Use the buffered upload endpoint or switch to Backblaze/S3/Wasabi.`,
        }
      }

      const timestamp = Date.now()
      const safeName = options.originalFilename.replace(/[^\w.\-]+/g, '_')
      const filename = `${timestamp}-${safeName}`
      const albumPath = (album.storagePath as string) || ''
      const key = albumPath ? `${albumPath}/${filename}` : filename

      const presigned = await storageService.getPresignedUploadUrl(key, options.mimeType, {
        expiresInSeconds: 3600,
        contentLength: options.size,
      })

      return {
        success: true,
        data: {
          uploadUrl: presigned.url,
          key,
          storageProvider,
          expiresAt: presigned.expiresAt,
          requiredHeaders: presigned.requiredHeaders,
        },
      }
    } catch (error) {
      this.logger.error(
        `initPresignedUpload failed: ${error instanceof Error ? error.message : String(error)}`,
      )
      return {
        success: false,
        error: error instanceof Error ? error.message : 'Failed to init presigned upload',
      }
    }
  }

  /**
   * Presigned finalize: called after the browser confirms a successful PUT to storage.
   * Verifies the object exists at `key`, then inserts the video document.
   */
  async finalizePresignedUpload(options: PresignedFinalizeOptions): Promise<VideoUploadResult> {
    try {
      const db = mongoose.connection.db
      if (!db) throw new Error('Database connection not established')

      await this.ensureVideosCollection(db)

      const album = await db.collection('albums').findOne({ _id: new ObjectId(options.albumId) })
      if (!album) return { success: false, error: 'Album not found' }

      const storageProvider = (album.storageProvider as string) || 'local'
      const storageCtx = await resolveOwnerStorageContext(
        album.createdBy ? String(album.createdBy) : undefined,
      )
      const storageService = await storageManager.getProvider(
        storageProvider as 'local' | 'google-drive' | 'aws-s3' | 'backblaze' | 'wasabi',
        storageCtx,
      )

      // Verify the object was actually uploaded to storage.
      const exists = await storageService.fileExists(options.key)
      if (!exists) {
        return { success: false, error: 'Uploaded object not found in storage' }
      }
      const info = await storageService.getFileInfo(options.key)
      if (info.size !== options.size) {
        this.logger.warn(
          `finalizePresignedUpload: size mismatch (storage=${info.size}, client=${options.size}) for ${options.key}`,
        )
      }

      // Dedupe by (albumId, originalFilename, size) — hash is unavailable here
      // because we don't have the buffer. Hash-based dedupe stays on the buffered path.
      const videosCollection = db.collection('videos')
      const existingByShape = await videosCollection.findOne({
        albumId: new ObjectId(options.albumId),
        originalFilename: options.originalFilename,
        size: options.size,
      })
      if (existingByShape) {
        // Best-effort cleanup of the just-uploaded duplicate.
        try {
          await storageService.deleteFile(options.key)
        } catch (e) {
          this.logger.warn(
            `finalizePresignedUpload: failed to remove duplicate object ${options.key}: ${e instanceof Error ? e.message : String(e)}`,
          )
        }
        return {
          success: false,
          skipped: true,
          reason: 'Video with same filename and size already exists in this album',
        }
      }

      const providerCfg = storageService.getConfig?.() ?? {}
      const publicBaseUrl =
        storageProvider === 'backblaze' && typeof providerCfg.publicBaseUrl === 'string'
          ? providerCfg.publicBaseUrl.trim()
          : ''

      const filename = options.key.split('/').pop() || options.key

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
        title: { en: options.originalFilename },
        description: { en: '' },
        filename,
        originalFilename: options.originalFilename,
        mimeType: options.mimeType,
        size: options.size,
        hash: null as string | null, // Presigned uploads skip hash-based dedupe.
        duration: options.duration,
        dimensions: options.dimensions,
        storage: {
          provider: storageProvider,
          fileId: options.key,
          url: buildPublicUrl({
            providerId: storageProvider,
            key: options.key,
            publicBaseUrl,
            hash: '',
            ownerUserId: storageCtx?.ownerUserId,
          }),
          path: options.key,
          folderId: (album.storagePath as string) || '',
          ...(storageCtx ? { storageOwnerId: storageCtx.ownerUserId } : {}),
        },
        albumId: new ObjectId(options.albumId),
        isPublished: true,
        uploadedBy: uploaderObjectId,
        uploadedAt: new Date(),
        updatedAt: new Date(),
      }

      const insertResult = await videosCollection.insertOne(videoData)
      const savedVideo = { _id: insertResult.insertedId, ...videoData }

      try {
        await db
          .collection('albums')
          .updateOne({ _id: new ObjectId(options.albumId) }, { $inc: { videoCount: 1 } })
      } catch (e) {
        this.logger.warn(
          `finalizePresignedUpload: failed to increment album videoCount: ${e instanceof Error ? e.message : String(e)}`,
        )
      }

      return { success: true, video: savedVideo }
    } catch (error) {
      this.logger.error(
        `finalizePresignedUpload failed: ${error instanceof Error ? error.message : String(error)}`,
      )
      return {
        success: false,
        error: error instanceof Error ? error.message : 'Finalize failed',
      }
    }
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
