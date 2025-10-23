import { NextRequest, NextResponse } from 'next/server'
import { connectToDatabase } from '@/lib/mongodb'
import { ObjectId } from 'mongodb'
import { ExifExtractor } from '@/services/exif-extractor'
import { DatabaseOptimizer } from '@/services/database-optimizer'
import { CacheManager } from '@/services/cache-manager'
import { getCurrentUser } from '@/lib/access-control-server'

export async function GET(
  request: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  try {
    const { id } = await params
    const { db } = await connectToDatabase()
    
    if (!id) {
      return NextResponse.json(
        { success: false, error: 'Album ID is required' },
        { status: 400 }
      )
    }

    let objectId
    try {
      objectId = new ObjectId(id)
    } catch (error) {
      return NextResponse.json(
        { success: false, error: 'Invalid album ID format' },
        { status: 400 }
      )
    }

    // Get current user for access control
    const user = await getCurrentUser()
    
    // Build query with publication status filtering
    const query: any = { 
      $or: [
        { albumId: objectId },
        { albumId: id }
      ]
    }
    
    // For public album pages, ALWAYS show only published photos
    // This ensures that even if an admin visits a public album URL, 
    // they only see published photos (drafts are only visible in admin panel)
    query.isPublished = true
    
    // Get photos for this album using the working logic
    const photosCollection = db.collection('photos')
    console.log(`Photos API: Looking for photos with albumId: ${id} or ObjectId: ${objectId}`)
    console.log(`Photos API: User role: ${user?.role || 'anonymous'}, Query:`, JSON.stringify(query, null, 2))
    
    const photos = await photosCollection
      .find(query)
      .sort({ uploadedAt: -1 })
      .toArray()
    
    console.log(`Photos API: Found ${photos.length} photos for album ${id}`)
    if (photos.length > 0) {
      console.log('Photos API: First photo sample:', {
        _id: photos[0]._id,
        filename: photos[0].filename,
        albumId: photos[0].albumId,
        isPublished: photos[0].isPublished,
        storage: photos[0].storage
      })
    }

    // Process photos for EXIF data extraction (on-demand)
    const processedPhotos = await ExifExtractor.processPhotosForExif(photos)

    return NextResponse.json({
      success: true,
      data: processedPhotos
    })
  } catch (error) {
    console.error('Failed to get album photos:', error)
    return NextResponse.json(
      { success: false, error: 'Failed to get album photos' },
      { status: 500 }
    )
  }
}
