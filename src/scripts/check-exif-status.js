// Check EXIF status of photos
const { MongoClient } = require('mongodb')

async function checkExifStatus() {
  let client
  
  try {
    console.log('🔍 Checking EXIF status of photos...')
    
    // Connect to MongoDB with timeout
    const mongoUri = process.env.MONGODB_URI
    client = new MongoClient(mongoUri)
    
    // Set connection timeout
    const timeoutPromise = new Promise((_, reject) => 
      setTimeout(() => reject(new Error('Connection timeout')), 10000)
    )
    
    await Promise.race([client.connect(), timeoutPromise])
    
    const db = client.db()
    const photosCollection = db.collection('photos')
    
    // Count photos without EXIF data
    const photosWithoutExif = await photosCollection.countDocuments({ 
      $or: [
        { exif: { $exists: false } },
        { exif: null }
      ]
    })
    
    // Count photos with EXIF data
    const photosWithExif = await photosCollection.countDocuments({ 
      exif: { $exists: true, $ne: null }
    })
    
    // Total photos
    const totalPhotos = await photosCollection.countDocuments({})
    
    console.log(`📊 EXIF Status:`)
    console.log(`   Total photos: ${totalPhotos}`)
    console.log(`   Photos with EXIF: ${photosWithExif}`)
    console.log(`   Photos without EXIF: ${photosWithoutExif}`)
    
    // Show a few examples
    if (photosWithExif > 0) {
      console.log(`\n📸 Examples of photos with EXIF data:`)
      const examples = await photosCollection.find({ 
        exif: { $exists: true, $ne: null } 
      }).limit(3).toArray()
      
      examples.forEach(photo => {
        console.log(`   ${photo.filename}: ${JSON.stringify(photo.exif)}`)
      })
    }
    
  } catch (error) {
    console.error('❌ Script failed:', error)
  } finally {
    if (client) {
      await client.close()
    }
  }
}

// Run the script
checkExifStatus()
  .then(() => {
    console.log('\n✅ Check complete')
    process.exit(0)
  })
  .catch((error) => {
    console.error('❌ Check failed:', error)
    process.exit(1)
  })
