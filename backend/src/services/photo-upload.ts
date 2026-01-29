import { Injectable, Logger } from '@nestjs/common';
import sharp from 'sharp'
import { storageManager } from './storage/manager'
import mongoose, { Types } from 'mongoose'
import { ThumbnailGenerator } from './thumbnail-generator'
import { ImageCompressionService } from './image-compression'
import { createHash } from 'crypto'
import * as fs from 'fs/promises'
import * as path from 'path'
// Models imported for type references but not directly used
// import { PhotoModel } from '../models/Photo'
// import { AlbumModel } from '../models/Album'
// import { UserModel } from '../models/User'

const { ObjectId } = Types;

export interface PhotoUploadOptions {
  albumId?: string
  title?: string
  description?: string
  tags?: string[]
  storageProvider?: string
  replaceIfExists?: boolean // If true, replace existing photo instead of skipping
}

export interface PhotoUploadResult {
  success: boolean
  photo?: any
  error?: string
  thumbnailPath?: string
  thumbnails?: Record<string, string>
  blurDataURL?: string
  exifData?: any
  skipped?: boolean
  reason?: string
}

export interface UploadReport {
  total: number
  successful: number
  skipped: number
  failed: number
  successes: Array<{
    filename: string
    photoId?: string
    message?: string
  }>
  skippedItems: Array<{
    filename: string
    reason: string
  }>
  failures: Array<{
    filename: string
    error: string
  }>
}

@Injectable()
export class PhotoUploadService {
  private readonly logger = new Logger(PhotoUploadService.name)
  private static readonly logger = new Logger(PhotoUploadService.name)
  private static readonly THUMBNAIL_WIDTH = 300
  private static readonly THUMBNAIL_HEIGHT = 300
  private static readonly THUMBNAIL_QUALITY = 80

  /**
   * Calculate SHA-256 hash of file buffer
   */
  private calculateHash(fileBuffer: Buffer): string {
    return createHash('sha256').update(fileBuffer).digest('hex')
  }

  /**
   * Check if photo already exists by hash or filename+size
   */
  async checkPhotoExists(
    fileBuffer: Buffer,
    originalFilename: string,
    albumId?: string
  ): Promise<{ exists: boolean; existingPhoto?: any; reason?: string }> {
    try {
      const db = mongoose.connection.db
      if (!db) {
        return { exists: false }
      }

      const photosCollection = db.collection('photos')
      const hash = this.calculateHash(fileBuffer)
      const fileSize = fileBuffer.length

      // Check by hash first (most reliable)
      const existingByHash = await photosCollection.findOne({ hash })
      if (existingByHash) {
        return {
          exists: true,
          existingPhoto: existingByHash,
          reason: 'Photo with same hash already exists'
        }
      }

      // Check by originalFilename + size (fallback)
      const existingByFilename = await photosCollection.findOne({
        originalFilename,
        size: fileSize
      })
      if (existingByFilename) {
        return {
          exists: true,
          existingPhoto: existingByFilename,
          reason: 'Photo with same filename and size already exists'
        }
      }

      // Optionally check within the same album
      if (albumId) {
        const existingInAlbum = await photosCollection.findOne({
          albumId: new ObjectId(albumId),
          originalFilename,
          size: fileSize
        })
        if (existingInAlbum) {
          return {
            exists: true,
            existingPhoto: existingInAlbum,
            reason: 'Photo already exists in this album'
          }
        }
      }

      return { exists: false }
    } catch (error) {
      this.logger.error(`Error checking photo existence: ${error instanceof Error ? error.message : String(error)}`)
      // On error, assume it doesn't exist to allow upload attempt
      return { exists: false }
    }
  }

  async uploadPhoto(
    fileBuffer: Buffer,
    originalFilename: string,
    mimeType: string,
    options: PhotoUploadOptions & { uploadedBy?: string } = {}
  ): Promise<PhotoUploadResult> {
    try {
      const db = mongoose.connection.db;
      
      if (!db) {
        throw new Error('Database connection not established');
      }

      // Ensure photos collection exists and indexes are created
      await this.ensurePhotosCollection(db)

      // Track existing photo ID if we're replacing
      let existingPhotoId: Types.ObjectId | null = null

      // Check if photo already exists
      const existenceCheck = await this.checkPhotoExists(
        fileBuffer,
        originalFilename,
        options.albumId
      )
      if (existenceCheck.exists) {
        // If replaceIfExists is true, delete old files and update the existing record
        if (options.replaceIfExists && existenceCheck.existingPhoto) {
          this.logger.debug(`PhotoUploadService: Photo exists, replacing files as requested: ${existenceCheck.existingPhoto._id}`)
          
          const existingPhoto = existenceCheck.existingPhoto
          existingPhotoId = existingPhoto._id
          
          // Delete old photo files from storage (but keep the database record)
          if (existingPhoto.storage && existingPhoto.storage.provider && existingPhoto.storage.path) {
            try {
              const storageService = await storageManager.getProvider(existingPhoto.storage.provider as any)
              
              // Helper function to extract path from URL
              const extractPathFromUrl = (url: string): string | null => {
                if (!url || typeof url !== 'string') return null
                const urlMatch = url.match(/\/api\/storage\/serve\/[^/]+\/(.+)$/)
                if (urlMatch && urlMatch[1]) {
                  try {
                    return decodeURIComponent(urlMatch[1])
                  } catch {
                    return urlMatch[1]
                  }
                }
                if (!url.startsWith('/api/storage/serve/')) {
                  return url
                }
                return null
              }
              
              // Delete main photo file
              await storageService.deleteFile(existingPhoto.storage.path)
              this.logger.debug(`PhotoUploadService: Deleted old main photo file: ${existingPhoto.storage.path}`)
              
              // Delete thumbnails
              if (existingPhoto.storage.thumbnails && typeof existingPhoto.storage.thumbnails === 'object') {
                for (const [size, thumbnailUrl] of Object.entries(existingPhoto.storage.thumbnails)) {
                  try {
                    const thumbnailPath = extractPathFromUrl(thumbnailUrl as string)
                    if (thumbnailPath && thumbnailPath !== existingPhoto.storage.path) {
                      await storageService.deleteFile(thumbnailPath)
                      this.logger.debug(`PhotoUploadService: Deleted old ${size} thumbnail: ${thumbnailPath}`)
                    }
                  } catch (thumbError) {
                    this.logger.warn(`PhotoUploadService: Failed to delete ${size} thumbnail:`, thumbError)
                  }
                }
              }
              
              // Delete thumbnailPath if different
              if (existingPhoto.storage.thumbnailPath) {
                const thumbPath = extractPathFromUrl(existingPhoto.storage.thumbnailPath)
                if (thumbPath && thumbPath !== existingPhoto.storage.path) {
                  const alreadyDeleted = existingPhoto.storage.thumbnails &&
                    Object.values(existingPhoto.storage.thumbnails).some((url) => {
                      const path = extractPathFromUrl(url as string)
                      return path === thumbPath
                    })
                  
                  if (!alreadyDeleted) {
                    await storageService.deleteFile(thumbPath)
                    this.logger.debug(`PhotoUploadService: Deleted old thumbnailPath: ${thumbPath}`)
                  }
                }
              }
            } catch (storageError) {
              this.logger.error(`PhotoUploadService: Failed to delete old photo files from storage:`, storageError)
              // Continue with upload anyway - new files will overwrite references
            }
          }
          
          // Note: We keep the database record and will update it with new file references
          // Don't delete the record or decrement album count
        } else {
          // Skip upload if replaceIfExists is false or not set
          return {
            success: false,
            skipped: true,
            reason: existenceCheck.reason || 'Photo already exists',
            error: existenceCheck.reason || 'Photo already exists'
          }
        }
      }

      // Get album information if albumId is provided
      let album: any = null
      let storageProvider = options.storageProvider || 'local'
      
      if (options.albumId) {
        this.logger.debug(`PhotoUploadService: Looking up album with ID: ${options.albumId}`)
        try {
          const objectId = new ObjectId(options.albumId)
          album = await db.collection('albums').findOne({ _id: objectId })
          this.logger.debug(`PhotoUploadService: Album lookup result:`, album ? { _id: album._id?.toString(), alias: album.alias, name: album.name } : 'not found')
        } catch (error) {
          this.logger.error(`PhotoUploadService: Error looking up album:`, error)
          album = null
        }
        if (album && album.storageProvider) {
          storageProvider = album.storageProvider
        }
      } else {
        this.logger.debug('PhotoUploadService: No albumId provided, using default storage provider')
      }

      // Get storage service from the new storage manager
      this.logger.debug(`PhotoUploadService: Getting storage service for provider: ${storageProvider}`)
      const storageService = await storageManager.getProvider(storageProvider as 'local' | 'google-drive' | 'aws-s3' | 'backblaze' | 'wasabi')
      this.logger.debug(`PhotoUploadService: Storage service obtained: ${storageService.constructor.name}`)

      // Generate unique filename
      const timestamp = Date.now()
      const filename = `${timestamp}-${originalFilename}`
      
      // Use album path if it exists (folders should be created when album is created)
      let albumPath = ''
      if (album && album.storagePath) {
        albumPath = album.storagePath
        this.logger.debug(`PhotoUploadService: Using album path: ${albumPath} for provider: ${storageProvider}`)
        
        // Verify album folder exists (especially important for visible storage)
        if (storageProvider === 'google-drive') {
          try {
            const folderExists = await storageService.folderExists(albumPath)
            if (!folderExists) {
              this.logger.warn(`PhotoUploadService: Album folder does not exist at path: ${albumPath}, uploadFile will attempt to create it`)
            } else {
              this.logger.debug(`PhotoUploadService: Album folder verified at path: ${albumPath}`)
            }
          } catch (error) {
            this.logger.warn(`PhotoUploadService: Could not verify album folder existence: ${error instanceof Error ? error.message : String(error)}`)
            // Continue anyway - uploadFile will handle folder creation
          }
        }
      } else {
        this.logger.debug(`PhotoUploadService: No album path, uploading to root`)
      }

      // Compress original image for web delivery (used for serving, not storage)
      const compressionResult = await ImageCompressionService.compressImage(fileBuffer, 'gallery')
      
      // Upload ORIGINAL file to storage (not compressed version)
      // This preserves the full quality and size of the original image
      this.logger.debug(`PhotoUploadService: Uploading ORIGINAL file ${filename} (${(fileBuffer.length / 1024 / 1024).toFixed(2)}MB) to path: ${albumPath}`)
      const uploadResult = await storageService.uploadFile(
        fileBuffer, // Upload original file, not compressed version
        filename,
        mimeType,
        albumPath,
        {
          originalFilename,
          albumId: options.albumId,
          tags: options.tags,
          description: options.description || ''
        }
      )
      this.logger.debug(`PhotoUploadService: Upload result: ${JSON.stringify(uploadResult)}`)

      // Generate multiple thumbnails
      const thumbnailBuffers = await ThumbnailGenerator.generateAllThumbnails(fileBuffer, filename)
      const thumbnails: Record<string, string> = {}
      
      // Upload each thumbnail size
      for (const [sizeName, buffer] of Object.entries(thumbnailBuffers)) {
        // Declare variables outside try block so they're accessible in catch
        const sizeConfig = ThumbnailGenerator.getThumbnailSize(sizeName as any)
        const thumbnailFilename = `${sizeName}-${filename}`
        
        // Build size-specific folder path
        // Use the album path + thumbnail folder name (e.g., /album-name/hero)
        // These folders should already exist (created when album was created)
        const sizeFolderPath = albumPath ? `${albumPath}/${sizeConfig.folder}` : sizeConfig.folder
        
        try {
          // Verify the thumbnail folder exists before uploading (especially for Google Drive)
          // This ensures we're using the correct existing folder, not creating duplicates
          if (storageProvider === 'google-drive' && albumPath) {
            try {
              const folderExists = await storageService.folderExists(sizeFolderPath)
              if (!folderExists) {
                this.logger.warn(`PhotoUploadService: Thumbnail folder ${sizeFolderPath} does not exist, uploadFile will create it`)
              } else {
                this.logger.debug(`PhotoUploadService: Thumbnail folder ${sizeFolderPath} verified`)
              }
            } catch (checkError) {
              this.logger.warn(`PhotoUploadService: Could not verify thumbnail folder existence: ${checkError instanceof Error ? checkError.message : String(checkError)}`)
              // Continue - uploadFile will handle folder creation if needed
            }
          }
          
          // Upload thumbnail - uploadFile will use existing folder or create if missing
          // Note: Don't pass 'size' in metadata as it conflicts with Google Drive API's reserved 'size' field
          this.logger.debug(`PhotoUploadService: Uploading ${sizeName} thumbnail (${(buffer.length / 1024).toFixed(2)}KB) to path: ${sizeFolderPath || 'root'}`)
          const thumbnailResult = await storageService.uploadFile(
            buffer,
            thumbnailFilename,
            'image/jpeg',
            sizeFolderPath,
            { 
              originalFile: filename, 
              thumbnailSize: sizeName  // Use 'thumbnailSize' instead of 'size' to avoid conflict
            }
          )
          
          this.logger.debug(`PhotoUploadService: Successfully uploaded ${sizeName} thumbnail:`, thumbnailResult.path)
          thumbnails[sizeName] = `/api/storage/serve/${storageProvider}/${encodeURIComponent(thumbnailResult.path)}`
        } catch (error) {
          this.logger.error(`PhotoUploadService: Failed to upload ${sizeName} thumbnail:`, error)
          this.logger.error(`PhotoUploadService: Error details:`, {
            sizeName,
            thumbnailFilename,
            sizeFolderPath,
            albumPath,
            storageProvider,
            error: error instanceof Error ? {
              message: error.message,
              stack: error.stack,
              name: error.name,
              // Check if it's a StorageOperationError with more details
              ...(error as any).details ? { details: (error as any).details } : {}
            } : error
          })
          // Continue with other thumbnails even if one fails
          // This allows the photo to be uploaded even if some thumbnails fail
        }
      }
      
      // Generate blur placeholder for progressive loading
      const blurDataURL = await ThumbnailGenerator.generateBlurPlaceholder(fileBuffer)
      
      // Keep the original thumbnail for backward compatibility
      const mediumThumbnail = thumbnails.medium || thumbnails.small || Object.values(thumbnails)[0]

      // Extract EXIF data (use comprehensive extractor)
      const { ExifExtractor } = await import('./exif-extractor')
      const exifData = await ExifExtractor.extractExifData(fileBuffer)

      // Get image dimensions (after EXIF auto-rotation)
      // Sharp auto-rotates based on EXIF, so we need to account for orientation
      const imageInfo = await sharp(fileBuffer).metadata()
      let width = imageInfo.width || 0
      let height = imageInfo.height || 0
      
      // If there's an orientation tag that requires rotation, swap dimensions
      // Orientation values: 1=normal, 3=180°, 6=90°CW, 8=90°CCW
      // For 6 and 8, width and height are swapped in metadata
      if (imageInfo.orientation) {
        if (imageInfo.orientation === 6 || imageInfo.orientation === 8) {
          // Swap width and height for 90° rotations
          [width, height] = [height, width]
        }
      }
      
      const dimensions = {
        width,
        height
      }

      // Calculate file hash for duplicate detection
      const hash = this.calculateHash(fileBuffer)

      // Resolve uploader ObjectId (fallback to real system user if not provided)
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

      // Prepare photo data for database
      // If updating existing photo, preserve existing metadata (title, description, tags, uploadedBy, uploadedAt)
      let existingPhoto: any = null
      if (existingPhotoId) {
        existingPhoto = await db.collection('photos').findOne({ _id: existingPhotoId })
      }
      
      const photoData = {
        title: existingPhoto?.title || { en: options.title || originalFilename },
        description: existingPhoto?.description || { en: options.description || '' },
        filename,
        originalFilename,
        mimeType,
        size: compressionResult.compressed.length,
        originalSize: fileBuffer.length,
        compressionRatio: compressionResult.compressionRatio,
        hash,
        dimensions,
        storage: {
          provider: storageProvider,
          fileId: uploadResult.fileId,
          url: `/api/storage/serve/${storageProvider}/${encodeURIComponent(uploadResult.path)}`,
          path: uploadResult.path,
          thumbnailPath: mediumThumbnail,
          thumbnails: thumbnails,
          blurDataURL: blurDataURL,
          folderId: uploadResult.folderId
        },
        albumId: options.albumId ? new ObjectId(options.albumId) : null,
        tags: existingPhoto?.tags || options.tags || [],
        isPublished: existingPhoto?.isPublished !== undefined ? existingPhoto.isPublished : true,
        isLeading: existingPhoto?.isLeading !== undefined ? existingPhoto.isLeading : false,
        uploadedBy: existingPhoto?.uploadedBy || uploaderObjectId,
        uploadedAt: existingPhoto?.uploadedAt || new Date(),
        updatedAt: new Date(),
        exif: exifData
      }

      // Save or update photo in database (native driver)
      const photosCollection = db.collection('photos')
      let savedPhoto: any
      
      if (existingPhotoId) {
        // Update existing record with new file references (preserve metadata)
        this.logger.debug(
          `PhotoUploadService: Updating existing photo record with new file references: ${JSON.stringify({
            photoId: existingPhotoId.toString(),
            albumId: photoData.albumId?.toString() || null,
            filename: photoData.filename,
            storageProvider: photoData.storage.provider,
          })}`,
        )

        // Update only file-related fields, preserve other metadata (title, description, tags, uploadedBy, uploadedAt, etc.)
        const updateResult = await photosCollection.updateOne(
          { _id: existingPhotoId },
          {
            $set: {
              filename: photoData.filename,
              originalFilename: photoData.originalFilename,
              mimeType: photoData.mimeType,
              size: photoData.size,
              originalSize: photoData.originalSize,
              compressionRatio: photoData.compressionRatio,
              hash: photoData.hash,
              dimensions: photoData.dimensions,
              storage: photoData.storage,
              updatedAt: new Date(),
              exif: photoData.exif,
              // Preserve: title, description, tags, uploadedBy, uploadedAt, isPublished, isLeading, albumId
            },
          },
        )
        
        if (updateResult.matchedCount === 0) {
          throw new Error(`Failed to update photo record: ${existingPhotoId}`)
        }
        
        // Fetch the updated photo
        savedPhoto = await photosCollection.findOne({ _id: existingPhotoId })
        if (!savedPhoto) {
          throw new Error(`Failed to retrieve updated photo: ${existingPhotoId}`)
        }
        
        this.logger.debug(
          `PhotoUploadService: Photo record updated successfully: ${JSON.stringify({
            photoId: savedPhoto._id.toString(),
            albumId: savedPhoto.albumId?.toString() || null,
          })}`,
        )
        
        // Don't increment album count - it's the same photo, just with new files
      } else {
        // Insert new record
        this.logger.debug('PhotoUploadService: Saving new photo to database:', {
          albumId: photoData.albumId?.toString() || null,
          filename: photoData.filename,
          isPublished: photoData.isPublished,
          storageProvider: photoData.storage.provider
        })
        const insertResult = await photosCollection.insertOne(photoData)
        savedPhoto = { _id: insertResult.insertedId, ...photoData }
        this.logger.debug(
          `PhotoUploadService: Photo saved successfully: ${JSON.stringify({
            photoId: savedPhoto._id.toString(),
            albumId: savedPhoto.albumId?.toString() || null,
          })}`,
        )

        // Update album photo count if album exists (only for new photos)
        if (options.albumId) {
          try {
            await db.collection('albums').updateOne(
              { _id: new ObjectId(options.albumId) },
              { $inc: { photoCount: 1 } }
            )
          } catch (e) {
            this.logger.warn(`Failed to update album photo count: ${e instanceof Error ? e.message : String(e)}`)
          }
        }
      }

      return {
        success: true,
        photo: savedPhoto,
        thumbnailPath: mediumThumbnail,
        thumbnails: thumbnails,
        blurDataURL: blurDataURL,
        exifData
      }

    } catch (error) {
      this.logger.error(`Photo upload failed: ${error instanceof Error ? error.message : String(error)}`)
      return {
        success: false,
        error: error instanceof Error ? error.message : 'Upload failed'
      }
    }
  }

  private static async generateThumbnail(imageBuffer: Buffer): Promise<Buffer> {
    try {
      return await sharp(imageBuffer)
        .resize(this.THUMBNAIL_WIDTH, this.THUMBNAIL_HEIGHT, {
          fit: 'inside',
          withoutEnlargement: true
        })
        .jpeg({ quality: this.THUMBNAIL_QUALITY })
        .toBuffer()
    } catch (error) {
      this.logger.error(`Thumbnail generation failed: ${error instanceof Error ? error.message : String(error)}`)
      throw new Error('Failed to generate thumbnail')
    }
  }

  private static async extractExifData(imageBuffer: Buffer): Promise<any> {
    try {
      const ExifParser = require('exif-parser')
      const parser = ExifParser.create(imageBuffer)
      const result = parser.parse()
      
      if (!result.tags) {
        return null
      }

      // Extract relevant EXIF data
      const exifData: any = {}
      
      // Camera information
      if (result.tags.Make) exifData.make = result.tags.Make
      if (result.tags.Model) exifData.model = result.tags.Model
      
      // Date and time
      if (result.tags.DateTime) {
        exifData.dateTime = new Date(result.tags.DateTime)
      }
      
      // Camera settings
      if (result.tags.ExposureTime) exifData.exposureTime = result.tags.ExposureTime
      if (result.tags.FNumber) exifData.fNumber = result.tags.FNumber
      if (result.tags.ISO) exifData.iso = result.tags.ISO
      if (result.tags.FocalLength) exifData.focalLength = result.tags.FocalLength
      
      // GPS information
      if (result.tags.GPSLatitude && result.tags.GPSLongitude) {
        exifData.gps = {
          latitude: result.tags.GPSLatitude,
          longitude: result.tags.GPSLongitude
        }
        if (result.tags.GPSAltitude) {
          exifData.gps.altitude = result.tags.GPSAltitude
        }
      }
      
      // Software and copyright
      if (result.tags.Software) exifData.software = result.tags.Software
      if (result.tags.Copyright) exifData.copyright = result.tags.Copyright
      
      return Object.keys(exifData).length > 0 ? exifData : null
    } catch (error) {
      this.logger.warn(`Failed to extract EXIF data: ${error instanceof Error ? error.message : String(error)}`)
      return null
    }
  }



  // Folder creation is handled when albums are created, not during photo upload

  /**
   * Upload photos from a local folder
   */
  async uploadFromFolder(
    folderPath: string,
    options: PhotoUploadOptions & { uploadedBy?: string } = {}
  ): Promise<UploadReport> {
    const report: UploadReport = {
      total: 0,
      successful: 0,
      skipped: 0,
      failed: 0,
      successes: [],
      skippedItems: [],
      failures: []
    }

    try {
      // Check if folder exists
      const stats = await fs.stat(folderPath)
      if (!stats.isDirectory()) {
        report.failures.push({
          filename: folderPath,
          error: 'Path is not a directory'
        })
        report.failed = 1
        report.total = 1
        return report
      }

      // Read all files from folder
      const files = await fs.readdir(folderPath)
      const imageExtensions = ['.jpg', '.jpeg', '.png', '.gif', '.bmp', '.webp', '.tiff', '.tif']
      
      const imageFiles = files.filter(file => {
        const ext = path.extname(file).toLowerCase()
        return imageExtensions.includes(ext)
      })

      report.total = imageFiles.length

      // Process each image file
      for (const file of imageFiles) {
        const filePath = path.join(folderPath, file)
        try {
          // Read file
          const fileBuffer = await fs.readFile(filePath)
          
          // Determine MIME type from extension
          const ext = path.extname(file).toLowerCase()
          const mimeTypes: Record<string, string> = {
            '.jpg': 'image/jpeg',
            '.jpeg': 'image/jpeg',
            '.png': 'image/png',
            '.gif': 'image/gif',
            '.bmp': 'image/bmp',
            '.webp': 'image/webp',
            '.tiff': 'image/tiff',
            '.tif': 'image/tiff'
          }
          const mimeType = mimeTypes[ext] || 'image/jpeg'

          // Upload photo
          const result = await this.uploadPhoto(
            fileBuffer,
            file,
            mimeType,
            options
          )

          if (result.success) {
            report.successful++
            report.successes.push({
              filename: file,
              photoId: result.photo?._id?.toString(),
              message: 'Uploaded successfully'
            })
          } else if (result.skipped) {
            report.skipped++
            report.skippedItems.push({
              filename: file,
              reason: result.reason || 'Already exists'
            })
          } else {
            report.failed++
            report.failures.push({
              filename: file,
              error: result.error || 'Upload failed'
            })
          }
        } catch (error) {
          report.failed++
          report.failures.push({
            filename: file,
            error: error instanceof Error ? error.message : 'Unknown error'
          })
        }
      }
    } catch (error) {
      report.failures.push({
        filename: folderPath,
        error: error instanceof Error ? error.message : 'Failed to read folder'
      })
      report.failed++
      report.total = 1
    }

    return report
  }

  private async ensurePhotosCollection(db: any): Promise<void> {
    try {
      const existing = await db.listCollections({ name: 'photos' }).toArray()
      if (existing.length === 0) {
        await db.createCollection('photos')
        try {
          await db.collection('photos').createIndex({ albumId: 1 })
          await db.collection('photos').createIndex({ uploadedBy: 1 })
          await db.collection('photos').createIndex({ isPublished: 1 })
          await db.collection('photos').createIndex({ tags: 1 })
          await db.collection('photos').createIndex({ uploadedAt: -1 })
          await db.collection('photos').createIndex({ filename: 1 }, { unique: true })
          await db.collection('photos').createIndex({ hash: 1 })
          await db.collection('photos').createIndex({ originalFilename: 1, size: 1 })
        } catch (e) {
          this.logger.warn(`Index creation warning: ${e instanceof Error ? e.message : String(e)}`)
        }
      }
    } catch (e) {
      this.logger.warn(`Failed to ensure photos collection: ${e instanceof Error ? e.message : String(e)}`)
    }
  }
}
