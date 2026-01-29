const { MongoClient, ObjectId } = require('mongodb')
const sharp = require('sharp')
const https = require('https')
const http = require('http')

async function fixPhotoDimensions() {
  // Use the same MongoDB URI as the main application
  const mongoUri = 'mongodb://localhost:27017/openshutter'
  const client = new MongoClient(mongoUri)
  
  try {
    await client.connect()
    const db = client.db()
    const photosCollection = db.collection('photos')
    
    // Find photos that have 0x0 dimensions
    const photosWithMissingDimensions = await photosCollection.find({
      'storage.provider': 'google-drive',
      $or: [
        { 'dimensions.width': 0 },
        { 'dimensions.height': 0 },
        { 'dimensions.width': { $exists: false } },
        { 'dimensions.height': { $exists: false } }
      ]
    }).toArray()
    
    console.log(`Found ${photosWithMissingDimensions.length} photos with missing dimensions`)
    
    if (photosWithMissingDimensions.length === 0) {
      console.log('✅ All photos already have proper dimensions')
      return
    }
    
    let processedCount = 0
    let successCount = 0
    let errorCount = 0
    
    // Process each photo
    for (const photo of photosWithMissingDimensions) {
      try {
        console.log(`📸 Processing photo: ${photo.filename}`)
        
        // Download the image using the storage serve API
        const imageUrl = `http://localhost:4000${photo.storage.url}`
        
        const imageBuffer = await downloadImage(imageUrl)
        
        if (!imageBuffer) {
          console.log(`   ⚠️  Could not download image for ${photo.filename}`)
          errorCount++
          continue
        }
        
        // Extract dimensions using sharp
        const metadata = await sharp(imageBuffer).metadata()
        const width = metadata.width || 0
        const height = metadata.height || 0
        
        if (width === 0 || height === 0) {
          console.log(`   ⚠️  Could not extract valid dimensions for ${photo.filename}`)
          errorCount++
          continue
        }
        
        // Update photo with correct dimensions
        await photosCollection.updateOne(
          { _id: photo._id },
          { 
            $set: { 
              'dimensions.width': width,
              'dimensions.height': height,
              'updatedAt': new Date()
            }
          }
        )
        
        console.log(`   ✅ Updated dimensions: ${width}x${height}`)
        successCount++
        
      } catch (error) {
        console.error(`   ❌ Error processing ${photo.filename}:`, error.message)
        errorCount++
      }
      
      processedCount++
      
      // Progress update every 10 photos
      if (processedCount % 10 === 0) {
        console.log(`\n📊 Progress: ${processedCount}/${photosWithMissingDimensions.length} processed (${successCount} success, ${errorCount} errors)`)
      }
    }
    
    console.log(`\n🎉 Dimension fix completed!`)
    console.log(`   - Total processed: ${processedCount}`)
    console.log(`   - Successfully updated: ${successCount}`)
    console.log(`   - Errors: ${errorCount}`)
    
  } catch (error) {
    console.error('❌ Error during dimension fix:', error)
  } finally {
    await client.close()
  }
}

// Helper function to download image from URL
/**
 * @param {string} url
 * @returns {Promise<Buffer>}
 */
function downloadImage(url) {
  return new Promise((resolve, reject) => {
    const protocol = url.startsWith('https') ? https : http
    
    protocol.get(url, (response) => {
      if (response.statusCode !== 200) {
        reject(new Error(`HTTP ${response.statusCode}: ${response.statusMessage}`))
        return
      }
      
      const chunks = []
      response.on('data', (chunk) => {
        chunks.push(chunk)
      })
      
      response.on('end', () => {
        const buffer = Buffer.concat(chunks)
        resolve(buffer)
      })
      
      response.on('error', (error) => {
        reject(error)
      })
    }).on('error', (error) => {
      reject(error)
    })
  })
}

// Check if sharp is available
try {
  require.resolve('sharp')
  fixPhotoDimensions()
} catch (error) {
  console.error('❌ Sharp package not found. Please install it first:')
  console.error('   pnpm add sharp')
  console.error('   or')
  console.error('   npm install sharp')
}
