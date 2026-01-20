import { Injectable } from '@nestjs/common';
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
      console.error('Error checking photo existence:', error)
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

      // Check if photo already exists
      const existenceCheck = await this.checkPhotoExists(
        fileBuffer,
        originalFilename,
        options.albumId
      )
      if (existenceCheck.exists) {
        return {
          success: false,
          skipped: true,
          reason: existenceCheck.reason || 'Photo already exists',
          error: existenceCheck.reason || 'Photo already exists'
        }
      }

      // Get album information if albumId is provided
      let album: any = null
      let storageProvider = options.storageProvider || 'local'
      
      if (options.albumId) {
        console.log(`PhotoUploadService: Looking up album with ID: ${options.albumId}`)
        try {
          const objectId = new ObjectId(options.albumId)
          album = await db.collection('albums').findOne({ _id: objectId })
          console.log(`PhotoUploadService: Album lookup result:`, album ? { _id: album._id?.toString(), alias: album.alias, name: album.name } : 'not found')
        } catch (error) {
          console.error(`PhotoUploadService: Error looking up album:`, error)
          album = null
        }
        if (album && album.storageProvider) {
          storageProvider = album.storageProvider
        }
      } else {
        console.log('PhotoUploadService: No albumId provided, using default storage provider')
      }

      // Get storage service from the new storage manager
      console.log(`PhotoUploadService: Getting storage service for provider: ${storageProvider}`)
      const storageService = await storageManager.getProvider(storageProvider as 'local' | 'google-drive' | 'aws-s3' | 'backblaze' | 'wasabi')
      console.log(`PhotoUploadService: Storage service obtained:`, storageService.constructor.name)

      // Generate unique filename
      const timestamp = Date.now()
      const filename = `${timestamp}-${originalFilename}`
      
      // Use album path if it exists (folders should be created when album is created)
      let albumPath = ''
      if (album && album.storagePath) {
        albumPath = album.storagePath
        console.log(`PhotoUploadService: Using album path: ${albumPath} for provider: ${storageProvider}`)
        
        // Verify album folder exists (especially important for visible storage)
        if (storageProvider === 'google-drive') {
          try {
            const folderExists = await storageService.folderExists(albumPath)
            if (!folderExists) {
              console.warn(`PhotoUploadService: Album folder does not exist at path: ${albumPath}, uploadFile will attempt to create it`)
            } else {
              console.log(`PhotoUploadService: Album folder verified at path: ${albumPath}`)
            }
          } catch (error) {
            console.warn(`PhotoUploadService: Could not verify album folder existence:`, error instanceof Error ? error.message : String(error))
            // Continue anyway - uploadFile will handle folder creation
          }
        }
      } else {
        console.log(`PhotoUploadService: No album path, uploading to root`)
      }

      // Compress original image for web delivery
      const compressionResult = await ImageCompressionService.compressImage(fileBuffer, 'gallery')
      
      // Upload compressed original file
      console.log(`PhotoUploadService: Uploading file ${filename} to path: ${albumPath}`)
      const uploadResult = await storageService.uploadFile(
        compressionResult.compressed,
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
      console.log(`PhotoUploadService: Upload result:`, uploadResult)

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
                console.warn(`PhotoUploadService: Thumbnail folder ${sizeFolderPath} does not exist, uploadFile will create it`)
              } else {
                console.log(`PhotoUploadService: Thumbnail folder ${sizeFolderPath} verified`)
              }
            } catch (checkError) {
              console.warn(`PhotoUploadService: Could not verify thumbnail folder existence:`, checkError instanceof Error ? checkError.message : String(checkError))
              // Continue - uploadFile will handle folder creation if needed
            }
          }
          
          // Upload thumbnail - uploadFile will use existing folder or create if missing
          // Note: Don't pass 'size' in metadata as it conflicts with Google Drive API's reserved 'size' field
          console.log(`PhotoUploadService: Uploading ${sizeName} thumbnail (${(buffer.length / 1024).toFixed(2)}KB) to path: ${sizeFolderPath || 'root'}`)
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
          
          console.log(`PhotoUploadService: Successfully uploaded ${sizeName} thumbnail:`, thumbnailResult.path)
          thumbnails[sizeName] = `/api/storage/serve/${storageProvider}/${encodeURIComponent(thumbnailResult.path)}`
        } catch (error) {
          console.error(`PhotoUploadService: Failed to upload ${sizeName} thumbnail:`, error)
          console.error(`PhotoUploadService: Error details:`, {
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

      // Get image dimensions
      const imageInfo = await sharp(fileBuffer).metadata()
      const dimensions = {
        width: imageInfo.width || 0,
        height: imageInfo.height || 0
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
      const photoData = {
        title: { en: options.title || originalFilename },
        description: { en: options.description || '' },
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
        tags: options.tags || [],
        isPublished: true,
        isLeading: false,
        uploadedBy: uploaderObjectId,
        uploadedAt: new Date(),
        updatedAt: new Date(),
        exif: exifData
      }

      // Save to database (native driver)
      const photosCollection = db.collection('photos')
      console.log('PhotoUploadService: Saving photo to database:', {
        albumId: photoData.albumId?.toString() || null,
        filename: photoData.filename,
        isPublished: photoData.isPublished,
        storageProvider: photoData.storage.provider
      })
      const insertResult = await photosCollection.insertOne(photoData)
      const savedPhoto = { _id: insertResult.insertedId, ...photoData }
      console.log('PhotoUploadService: Photo saved successfully:', {
        photoId: savedPhoto._id.toString(),
        albumId: savedPhoto.albumId?.toString() || null
      })

      // Update album photo count if album exists
      if (options.albumId) {
        try {
          await db.collection('albums').updateOne(
            { _id: new ObjectId(options.albumId) },
            { $inc: { photoCount: 1 } }
          )
        } catch (e) {
          console.warn('Failed to update album photo count:', e)
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
      console.error('Photo upload failed:', error)
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
      console.error('Thumbnail generation failed:', error)
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
      console.warn('Failed to extract EXIF data:', error)
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
          console.warn('Index creation warning:', e)
        }
      }
    } catch (e) {
      console.warn('Failed to ensure photos collection:', e)
    }
  }
}
