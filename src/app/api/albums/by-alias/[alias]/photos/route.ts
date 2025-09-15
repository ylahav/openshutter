import { NextRequest, NextResponse } from 'next/server'
import { connectToDatabase } from '@/lib/mongodb'
import { ExifExtractor } from '@/services/exif-extractor'
import { getCurrentUser, checkAlbumAccess } from '@/lib/access-control-server'

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
    
    // First get the album to check access
    const album = await db.collection('albums').findOne(
      { alias },
      {
        projection: {
          _id: 1,
          isPublic: 1,
          allowedGroups: 1,
          allowedUsers: 1
        }
      }
    )
    
    if (!album) {
      return NextResponse.json(
        { success: false, error: 'Album not found' },
        { status: 404 }
      )
    }

    // Check access control (admins can access everything)
    const user = await getCurrentUser()
    if (user?.role !== 'admin') {
      const hasAccess = await checkAlbumAccess({
        isPublic: album.isPublic,
        allowedGroups: album.allowedGroups,
        allowedUsers: album.allowedUsers
      }, user)

      if (!hasAccess) {
        return NextResponse.json(
          { success: false, error: 'Access denied' },
          { status: 403 }
        )
      }
    }

    // Get total count for pagination (handle both string and ObjectId albumId formats)
    const totalPhotos = await db.collection('photos').countDocuments({
      $or: [
        { albumId: album._id },
        { albumId: album._id.toString() }
      ],
      isPublished: true
    })

    // Get photos for this album with pagination (only published ones for public view)
    const photos = await db.collection('photos')
      .find({ 
        $or: [
          { albumId: album._id },
          { albumId: album._id.toString() }
        ],
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
