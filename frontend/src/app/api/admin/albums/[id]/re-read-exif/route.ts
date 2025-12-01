import { NextRequest, NextResponse } from 'next/server'
import { connectToDatabase } from '@/lib/mongodb'
import { getCurrentUser } from '@/lib/access-control-server'
import { ExifExtractor } from '@/services/exif-extractor'
import { ObjectId } from 'mongodb'

export async function POST(
  request: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  try {
    const { id } = await params
    const { db } = await connectToDatabase()
    const user = await getCurrentUser()
    
    if (!user) {
      return NextResponse.json(
        { success: false, error: 'Unauthorized' },
        { status: 401 }
      )
    }

    // Check if user has admin or owner privileges
    if (user.role !== 'admin' && user.role !== 'owner') {
      return NextResponse.json(
        { success: false, error: 'Insufficient permissions' },
        { status: 403 }
      )
    }

    // Validate album ID
    let albumId: ObjectId
    try {
      albumId = new ObjectId(id)
      console.log(`🔍 Using album ID: ${albumId}`)
    } catch (error) {
      console.error(`❌ Invalid album ID format: ${id}`, error)
      return NextResponse.json(
        { success: false, error: 'Invalid album ID format' },
        { status: 400 }
      )
    }

    // Check if album exists
    const albumsCollection = db.collection('albums')
    const album = await albumsCollection.findOne({ _id: albumId })
    if (!album) {
      return NextResponse.json(
        { success: false, error: 'Album not found' },
        { status: 404 }
      )
    }

    // Get all photos in this album (ObjectId-only)
    const photosCollection = db.collection('photos')
    const photos = await photosCollection.find({ albumId: albumId }).toArray()
    
    console.log(`📊 Album ${album.alias} (${albumId}) has ${album.photoCount} photos according to album record`)
    console.log(`📊 Found ${photos.length} photos in photos collection with albumId: ${albumId}`)
    
    if (photos.length === 0) {
      return NextResponse.json({
        success: true,
        message: `No photos found in this album. Album record shows ${album.photoCount} photos, but none found in photos collection.`,
        data: {
          processed: 0,
          updated: 0,
          errors: 0,
          albumPhotoCount: album.photoCount,
          foundPhotos: 0
        }
      })
    }

    console.log(`🔄 Starting EXIF re-read for album ${album.alias} with ${photos.length} photos`)

    let processed = 0
    let updated = 0
    let errors = 0
    const errorsList: string[] = []

    // Process each photo
    for (const photo of photos) {
      try {
        console.log(`📸 Processing photo ${processed + 1}/${photos.length}: ${photo.filename}`)
        console.log(`   Photo ID: ${photo._id}`)
        console.log(`   Photo storage: ${photo.storage?.provider || 'unknown'}`)
        console.log(`   Photo path: ${photo.storage?.path || 'unknown'}`)
        
        // Use the ExifExtractor to re-read EXIF data
        const updatedPhoto = await ExifExtractor.extractAndUpdateExif(photo, { force: true })
        
        // Persist only if EXIF found; always touch updatedAt
        if (updatedPhoto?.exif) {
          await photosCollection.updateOne(
            { _id: photo._id },
            { $set: { exif: updatedPhoto.exif, updatedAt: new Date() } }
          )
          updated++
          console.log(`✅ Updated EXIF data for ${photo.filename}`)
        } else {
          await photosCollection.updateOne(
            { _id: photo._id },
            { $set: { updatedAt: new Date() } }
          )
          console.log(`ℹ️  No EXIF data found for ${photo.filename}`)
        }
        
        processed++
      } catch (error) {
        console.error(`❌ Failed to process ${photo.filename}:`, error)
        errors++
        errorsList.push(`${photo.filename}: ${error instanceof Error ? error.message : 'Unknown error'}`)
      }
    }

    console.log(`🎉 EXIF re-read completed for album ${album.alias}`)
    console.log(`   Processed: ${processed}`)
    console.log(`   Updated: ${updated}`)
    console.log(`   Errors: ${errors}`)

    return NextResponse.json({
      success: true,
      message: `EXIF data re-read completed for album "${album.alias}"`,
      data: {
        processed,
        updated,
        errors,
        errorsList: errorsList.length > 0 ? errorsList : undefined
      }
    })

  } catch (error) {
    console.error('Failed to re-read EXIF data:', error)
    return NextResponse.json(
      { 
        success: false, 
        error: 'Failed to re-read EXIF data',
        details: error instanceof Error ? error.message : 'Unknown error'
      },
      { status: 500 }
    )
  }
}
