import { NextRequest, NextResponse } from 'next/server'
import { connectToDatabase } from '@/lib/mongodb'
import { ExifExtractor } from '@/services/exif-extractor'

export async function GET(
  request: NextRequest,
  { params }: { params: Promise<{ alias: string }> }
) {
  try {
    const { alias } = await params
    const { searchParams } = new URL(request.url)
    
    // Pagination parameters
    const page = parseInt(searchParams.get('page') || '1')
    const limit = parseInt(searchParams.get('limit') || '16')
    const skip = (page - 1) * limit
    
    const { db } = await connectToDatabase()
    
    // First get the album to check if it's public
    const album = await db.collection('albums').findOne({ alias })
    
    if (!album) {
      return NextResponse.json(
        { success: false, error: 'Album not found' },
        { status: 404 }
      )
    }

    // Only return photos for public albums
    if (!album.isPublic) {
      return NextResponse.json(
        { success: false, error: 'Album is private' },
        { status: 403 }
      )
    }

    // Get total count for pagination
    const totalPhotos = await db.collection('photos').countDocuments({
      albumId: album._id,
      isPublished: true
    })

    // Get photos for this album with pagination (only published ones for public view)
    const photos = await db.collection('photos')
      .find({ 
        albumId: album._id,
        isPublished: true 
      })
      .sort({ createdAt: -1 })
      .skip(skip)
      .limit(limit)
      .toArray()

    
    // Process photos for EXIF data extraction (on-demand)
    const processedPhotos = await ExifExtractor.processPhotosForExif(photos)
    
    // Calculate pagination info
    const totalPages = Math.ceil(totalPhotos / limit)
    const hasNextPage = page < totalPages
    const hasPrevPage = page > 1
    
    return NextResponse.json({ 
      success: true, 
      data: processedPhotos,
      pagination: {
        page,
        limit,
        total: totalPhotos,
        totalPages,
        hasNextPage,
        hasPrevPage
      }
    })
  } catch (error) {
    console.error('API: Error getting photos by album alias:', error)
    return NextResponse.json(
      { success: false, error: 'Failed to get photos' },
      { status: 500 }
    )
  }
}
