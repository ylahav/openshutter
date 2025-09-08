import sharp from 'sharp'
import { connectToDatabase } from '@/lib/mongodb'
import { storageManager } from './storage/manager'
import { ObjectId } from 'mongodb'

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
  exifData?: any
}

export class PhotoUploadService {
  private static readonly THUMBNAIL_WIDTH = 300
  private static readonly THUMBNAIL_HEIGHT = 300
  private static readonly THUMBNAIL_QUALITY = 80

  static async uploadPhoto(
    fileBuffer: Buffer,
    originalFilename: string,
    mimeType: string,
    options: PhotoUploadOptions = {}
  ): Promise<PhotoUploadResult> {
    try {
      // Connect to database
      const { db } = await connectToDatabase()

      // Ensure photos collection exists and indexes are created
      await this.ensurePhotosCollection(db)

      // Get album information if albumId is provided
      let album: any = null
      let storageProvider = options.storageProvider || 'local'
      
      if (options.albumId) {
        try {
          const objectId = new ObjectId(options.albumId)
          album = await db.collection('albums').findOne({ _id: objectId })
        } catch {
          album = null
        }
        if (album && album.storageProvider) {
          storageProvider = album.storageProvider
        }
      }

      // Get storage service from the new storage manager
      const storageService = await storageManager.getProvider(storageProvider as 'local' | 'google-drive' | 'aws-s3')

      // Generate unique filename
      const timestamp = Date.now()
      const extension = originalFilename.split('.').pop()
      const filename = `${timestamp}-${originalFilename}`
      
      // Use album path if it exists (folders should be created when album is created)
      let albumPath = ''
      if (album && album.storagePath) {
        albumPath = album.storagePath
      }

      // Upload original file
      const uploadResult = await storageService.uploadFile(
        fileBuffer,
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

      // Generate thumbnail
      const thumbnailBuffer = await this.generateThumbnail(fileBuffer)
      const thumbnailFilename = `thumb-${filename}`
      
      // Upload thumbnail to thumb subfolder
      let thumbnailPath = albumPath
      if (albumPath) {
        // Try to create thumb subfolder by using the path structure
        try {
          const thumbFolderResult = await storageService.createFolder('thumb', albumPath)
          thumbnailPath = `${albumPath}/thumb`
        } catch (error) {
          console.warn('PhotoUploadService: Failed to create thumb subfolder, using album folder:', error)
        }
      }
      
      // Upload thumbnail to thumb subfolder
      const thumbnailResult = await storageService.uploadFile(
        thumbnailBuffer,
        thumbnailFilename,
        'image/jpeg',
        thumbnailPath,
        { originalFile: filename }
      )

      // Extract EXIF data
      const exifData = await this.extractExifData(fileBuffer)

      // Get image dimensions
      const imageInfo = await sharp(fileBuffer).metadata()
      const dimensions = {
        width: imageInfo.width || 0,
        height: imageInfo.height || 0
      }

      // Prepare photo data for database
      const photoData = {
        title: { en: options.title || originalFilename },
        description: { en: options.description || '' },
        filename,
        originalFilename,
        mimeType,
        size: fileBuffer.length,
        dimensions,
        storage: {
          provider: storageProvider,
          fileId: uploadResult.fileId,
          url: `/api/storage/serve/${storageProvider}/${encodeURIComponent(uploadResult.path)}`,
          path: uploadResult.path,
          thumbnailPath: `/api/storage/serve/${storageProvider}/${encodeURIComponent(thumbnailResult.path)}`,
          folderId: uploadResult.folderId
        },
        albumId: options.albumId ? new ObjectId(options.albumId) : null,
        tags: options.tags || [],
        isPublished: true,
        isLeading: false,
        uploadedBy: 'admin', // TODO: Get from authenticated user
        uploadedAt: new Date(),
        updatedAt: new Date(),
        exif: exifData
      }

      // Save to database (native driver)
      const photosCollection = db.collection('photos')
      const insertResult = await photosCollection.insertOne(photoData)
      const savedPhoto = { _id: insertResult.insertedId, ...photoData }

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
        thumbnailPath: thumbnailResult.url,
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

  private static async ensurePhotosCollection(db: any): Promise<void> {
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
        } catch (e) {
          console.warn('Index creation warning:', e)
        }
      }
    } catch (e) {
      console.warn('Failed to ensure photos collection:', e)
    }
  }
}
