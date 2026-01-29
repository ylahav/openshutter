import { connectToDatabase } from '../lib/mongodb.js'
import { storageManager } from '../services/storage/manager.js'
import ExifParser from 'exif-parser'

async function extractExifFromExistingPhotos() {
  try {
    console.log('🔍 Extracting EXIF data from existing photos...')
    
    // Connect to database
    const { db } = await connectToDatabase()
    const photosCollection = db.collection('photos')
    
    // Get all photos that don't have EXIF data
    const photos = await photosCollection.find({ 
      $or: [
        { exif: { $exists: false } },
        { exif: null }
      ]
    }).toArray()
    
    console.log(`📸 Found ${photos.length} photos without EXIF data`)
    
    if (photos.length === 0) {
      console.log('✅ All photos already have EXIF data!')
      return
    }
    
    let processed = 0
    let success = 0
    let failed = 0
    
    for (const photo of photos) {
      try {
        console.log(`\n🔄 Processing photo: ${photo.filename}`)
        
        // Get the storage provider
        const storageProvider = photo.storage?.provider || 'local'
        const storageService = await storageManager.getProvider(storageProvider)
        
        // Download the original file
        const fileBuffer = await storageService.downloadFile(photo.storage.path)
        
        if (!fileBuffer) {
          console.log(`❌ Could not download file: ${photo.storage.path}`)
          failed++
          continue
        }
        
        // Extract EXIF data
        const exifData = await extractExifData(fileBuffer)
        
        // Update the photo in database
        await photosCollection.updateOne(
          { _id: photo._id },
          { $set: { exif: exifData } }
        )
        
        if (exifData) {
          console.log(`✅ Extracted EXIF data: ${JSON.stringify(exifData, null, 2)}`)
          success++
        } else {
          console.log(`ℹ️  No EXIF data found in photo`)
          success++
        }
        
        processed++
        
      } catch (error) {
        console.error(`❌ Failed to process photo ${photo.filename}:`, error.message)
        failed++
      }
    }
    
    console.log(`\n📊 Summary:`)
    console.log(`   Total processed: ${processed}`)
    console.log(`   Success: ${success}`)
    console.log(`   Failed: ${failed}`)
    
  } catch (error) {
    console.error('❌ Script failed:', error)
  }
}

async function extractExifData(imageBuffer) {
  try {
    const parser = ExifParser.create(imageBuffer)
    const result = parser.parse()
    
    if (!result.tags) {
      return null
    }

    // Extract relevant EXIF data
    const exifData = {}
    
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
    console.warn('Failed to extract EXIF data:', error.message)
    return null
  }
}

// Run the script
extractExifFromExistingPhotos()
  .then(() => {
    console.log('\n✅ EXIF extraction complete')
    process.exit(0)
  })
  .catch((error) => {
    console.error('❌ EXIF extraction failed:', error)
    process.exit(1)
  })
