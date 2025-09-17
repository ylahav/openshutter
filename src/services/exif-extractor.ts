import { connectToDatabase } from '@/lib/mongodb'
import { storageManager } from './storage/manager'

export interface ExifData {
  // Basic Camera Information
  make?: string
  model?: string
  serialNumber?: string
  
  // Date and Time
  dateTime?: Date
  dateTimeOriginal?: Date
  dateTimeDigitized?: Date
  offsetTime?: string
  offsetTimeOriginal?: string
  offsetTimeDigitized?: string
  
  // Camera Settings
  exposureTime?: string
  fNumber?: number
  iso?: number
  focalLength?: number
  exposureProgram?: string
  exposureMode?: string
  exposureBiasValue?: number
  maxApertureValue?: number
  shutterSpeedValue?: string
  apertureValue?: string
  
  // Image Quality
  whiteBalance?: string
  meteringMode?: string
  flash?: string
  colorSpace?: string
  customRendered?: string
  sceneCaptureType?: string
  
  // Resolution
  xResolution?: number
  yResolution?: number
  resolutionUnit?: string
  focalPlaneXResolution?: number
  focalPlaneYResolution?: number
  focalPlaneResolutionUnit?: string
  
  // Lens Information
  lensInfo?: string
  lensModel?: string
  lensSerialNumber?: string
  
  // Software and Processing
  software?: string
  copyright?: string
  exifVersion?: string
  
  // GPS Information
  gps?: {
    latitude?: number
    longitude?: number
    altitude?: number
  }
  
  // Additional Technical Data
  recommendedExposureIndex?: number
  subsecTimeOriginal?: string
  subsecTimeDigitized?: string
}

export class ExifExtractor {
  /**
   * Parse EXIF date format (YYYY:MM:DD HH:mm:ss) or Unix timestamp to JavaScript Date
   */
  private static parseExifDate(dateValue: any): Date | null {
    try {
      if (!dateValue) return null
      if (process.env.NODE_ENV === 'development') {
        console.log(`Parsing EXIF date: "${dateValue}" (type: ${typeof dateValue})`)
      }
      
      let date: Date
      
      // Check if it's a Unix timestamp (number or string that's all digits)
      if (typeof dateValue === 'number' || (typeof dateValue === 'string' && /^\d+$/.test(dateValue))) {
        // Unix timestamp - convert to milliseconds if it's in seconds
        const timestamp = typeof dateValue === 'string' ? parseInt(dateValue, 10) : dateValue
        const timestampMs = timestamp < 10000000000 ? timestamp * 1000 : timestamp // Convert seconds to milliseconds if needed
        date = new Date(timestampMs)
        if (process.env.NODE_ENV === 'development') {
          console.log(`Parsed as Unix timestamp: ${timestamp} -> ${date.toISOString()}`)
        }
      } else if (typeof dateValue === 'string') {
        // EXIF date format: "2025:07:18 05:13:46"
        // Convert to ISO format: "2025-07-18T05:13:46"
        const isoString = dateValue.replace(':', '-').replace(':', '-').replace(' ', 'T')
        if (process.env.NODE_ENV === 'development') {
          console.log(`Converted to ISO: "${isoString}"`)
        }
        date = new Date(isoString)
        if (process.env.NODE_ENV === 'development') {
          console.log(`Parsed as EXIF string: ${date.toISOString()}`)
        }
      } else {
        console.warn(`Unsupported date format: ${dateValue} (type: ${typeof dateValue})`)
        return null
      }
      
      // Validate the date
      if (isNaN(date.getTime())) {
        console.warn(`Invalid date: ${dateValue}`)
        return null
      }
      
      return date
    } catch (error) {
      console.warn(`Failed to parse EXIF date: ${dateValue}`, error)
      return null
    }
  }

  /**
   * Extract EXIF data from a photo buffer
   */
  static async extractExifData(imageBuffer: Buffer): Promise<ExifData | null> {
    try {
      const ExifParser = require('exif-parser')
      const parser = ExifParser.create(imageBuffer)
      const result = parser.parse()
      
      if (!result.tags) {
        return null
      }

      // Debug: Log all available EXIF tags
      if (process.env.NODE_ENV === 'development') {
        console.log('🔍 Available EXIF tags:')
        Object.keys(result.tags).forEach(key => {
          console.log(`   ${key}: "${result.tags[key]}" (type: ${typeof result.tags[key]})`)
        })
      }

      // Extract comprehensive EXIF data
      const exifData: ExifData = {}
      
      // Basic Camera Information
      if (result.tags.Make) exifData.make = result.tags.Make
      if (result.tags.Model) exifData.model = result.tags.Model
      if (result.tags.SerialNumber) exifData.serialNumber = result.tags.SerialNumber
      
      // Date and Time - Parse EXIF date format (YYYY:MM:DD HH:mm:ss)
      if (process.env.NODE_ENV === 'development') {
        console.log('📅 Checking date fields...')
        console.log(`   DateTime exists: ${!!result.tags.DateTime}`)
        console.log(`   DateTimeOriginal exists: ${!!result.tags.DateTimeOriginal}`)
        console.log(`   DateTimeDigitized exists: ${!!result.tags.DateTimeDigitized}`)
      }
      
      if (result.tags.DateTime) {
        if (process.env.NODE_ENV === 'development') {
          console.log(`Raw DateTime: "${result.tags.DateTime}"`)
        }
        const parsedDate = this.parseExifDate(result.tags.DateTime)
        if (parsedDate) exifData.dateTime = parsedDate
      }
      if (result.tags.DateTimeOriginal) {
        if (process.env.NODE_ENV === 'development') {
          console.log(`Raw DateTimeOriginal: "${result.tags.DateTimeOriginal}"`)
        }
        const parsedDate = this.parseExifDate(result.tags.DateTimeOriginal)
        if (parsedDate) exifData.dateTimeOriginal = parsedDate
      }
      if (result.tags.DateTimeDigitized) {
        if (process.env.NODE_ENV === 'development') {
          console.log(`Raw DateTimeDigitized: "${result.tags.DateTimeDigitized}"`)
        }
        const parsedDate = this.parseExifDate(result.tags.DateTimeDigitized)
        if (parsedDate) exifData.dateTimeDigitized = parsedDate
      }
      if (result.tags.OffsetTime) exifData.offsetTime = result.tags.OffsetTime
      if (result.tags.OffsetTimeOriginal) exifData.offsetTimeOriginal = result.tags.OffsetTimeOriginal
      if (result.tags.OffsetTimeDigitized) exifData.offsetTimeDigitized = result.tags.OffsetTimeDigitized
      
      // Camera Settings
      if (result.tags.ExposureTime) exifData.exposureTime = result.tags.ExposureTime
      if (result.tags.FNumber) exifData.fNumber = result.tags.FNumber
      if (result.tags.ISO || result.tags.ISOSpeedRatings) exifData.iso = result.tags.ISO || result.tags.ISOSpeedRatings
      if (result.tags.FocalLength) exifData.focalLength = result.tags.FocalLength
      if (result.tags.ExposureProgram) exifData.exposureProgram = result.tags.ExposureProgram
      if (result.tags.ExposureMode) exifData.exposureMode = result.tags.ExposureMode
      if (result.tags.ExposureBiasValue) exifData.exposureBiasValue = result.tags.ExposureBiasValue
      if (result.tags.MaxApertureValue) exifData.maxApertureValue = result.tags.MaxApertureValue
      if (result.tags.ShutterSpeedValue) exifData.shutterSpeedValue = result.tags.ShutterSpeedValue
      if (result.tags.ApertureValue) exifData.apertureValue = result.tags.ApertureValue
      
      // Image Quality
      if (result.tags.WhiteBalance) exifData.whiteBalance = result.tags.WhiteBalance
      if (result.tags.MeteringMode) exifData.meteringMode = result.tags.MeteringMode
      if (result.tags.Flash) exifData.flash = result.tags.Flash
      if (result.tags.ColorSpace) exifData.colorSpace = result.tags.ColorSpace
      if (result.tags.CustomRendered) exifData.customRendered = result.tags.CustomRendered
      if (result.tags.SceneCaptureType) exifData.sceneCaptureType = result.tags.SceneCaptureType
      
      // Resolution
      if (result.tags.XResolution) exifData.xResolution = result.tags.XResolution
      if (result.tags.YResolution) exifData.yResolution = result.tags.YResolution
      if (result.tags.ResolutionUnit) exifData.resolutionUnit = result.tags.ResolutionUnit
      if (result.tags.FocalPlaneXResolution) exifData.focalPlaneXResolution = result.tags.FocalPlaneXResolution
      if (result.tags.FocalPlaneYResolution) exifData.focalPlaneYResolution = result.tags.FocalPlaneYResolution
      if (result.tags.FocalPlaneResolutionUnit) exifData.focalPlaneResolutionUnit = result.tags.FocalPlaneResolutionUnit
      
      // Lens Information
      if (result.tags.LensInfo) exifData.lensInfo = result.tags.LensInfo
      if (result.tags.LensModel) exifData.lensModel = result.tags.LensModel
      if (result.tags.LensSerialNumber) exifData.lensSerialNumber = result.tags.LensSerialNumber
      
      // Software and Processing
      if (result.tags.Software) exifData.software = result.tags.Software
      if (result.tags.Copyright) exifData.copyright = result.tags.Copyright
      if (result.tags.ExifVersion) exifData.exifVersion = result.tags.ExifVersion
      
      // Additional Technical Data
      if (result.tags.RecommendedExposureIndex) exifData.recommendedExposureIndex = result.tags.RecommendedExposureIndex
      if (result.tags.SubsecTimeOriginal) exifData.subsecTimeOriginal = result.tags.SubsecTimeOriginal
      if (result.tags.SubsecTimeDigitized) exifData.subsecTimeDigitized = result.tags.SubsecTimeDigitized
      
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
      
      if (process.env.NODE_ENV === 'development') {
        console.log('📊 Final extracted EXIF data:')
        console.log(JSON.stringify(exifData, null, 2))
      }
      
      return Object.keys(exifData).length > 0 ? exifData : null
    } catch (error) {
      console.warn('Failed to extract EXIF data:', error)
      return null
    }
  }

  /**
   * Extract EXIF data from a photo and update the database
   * This is the main method for on-demand EXIF extraction
   */
  static async extractAndUpdateExif(photo: any): Promise<any> {
    try {
      // Check if photo already has EXIF data
      if (photo.exif && photo.exif !== null) {
        return photo // Already has EXIF data
      }

      if (process.env.NODE_ENV === 'development') {
        console.log(`🔍 Extracting EXIF data for photo: ${photo.filename}`)
        console.log(`   Storage provider: ${photo.storage?.provider}`)
        console.log(`   Storage path: ${photo.storage?.path}`)
      }

      // Get the storage provider
      const storageProvider = photo.storage?.provider || 'local'
      const storageService = await storageManager.getProvider(storageProvider as 'local' | 'google-drive' | 'aws-s3')

      if (process.env.NODE_ENV === 'development') {
        console.log(`   Storage service type: ${storageService.constructor.name}`)
        console.log(`   Available methods: ${Object.getOwnPropertyNames(Object.getPrototypeOf(storageService)).filter(name => name !== 'constructor')}`)
      }

      // Download the original file
      const fileBuffer = await storageService.getFileBuffer(photo.storage.path)
      
      if (!fileBuffer) {
        console.warn(`Could not download file for EXIF extraction: ${photo.storage.path}`)
        return photo
      }

      // Extract EXIF data
      const exifData = await this.extractExifData(fileBuffer)

      // Update the photo in database
      const { db } = await connectToDatabase()
      const photosCollection = db.collection('photos')
      
      await photosCollection.updateOne(
        { _id: photo._id },
        { $set: { exif: exifData } }
      )

      // Return updated photo
      const updatedPhoto = { ...photo, exif: exifData }
      
      if (exifData) {
        if (process.env.NODE_ENV === 'development') {
          console.log(`✅ Extracted EXIF data for ${photo.filename}:`, Object.keys(exifData))
        }
      } else {
        if (process.env.NODE_ENV === 'development') {
          console.log(`ℹ️  No EXIF data found for ${photo.filename}`)
        }
      }

      return updatedPhoto

    } catch (error) {
      console.error(`Failed to extract EXIF data for ${photo.filename}:`, error)
      return photo // Return original photo if extraction fails
    }
  }

  /**
   * Process multiple photos and extract EXIF data for those missing it
   */
  static async processPhotosForExif(photos: any[]): Promise<any[]> {
    const processedPhotos = []
    
    for (const photo of photos) {
      try {
        const processedPhoto = await this.extractAndUpdateExif(photo)
        processedPhotos.push(processedPhoto)
      } catch (error) {
        console.error(`Failed to process photo ${photo.filename}:`, error)
        processedPhotos.push(photo) // Add original photo if processing fails
      }
    }
    
    return processedPhotos
  }
}
