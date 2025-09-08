import { NextRequest, NextResponse } from 'next/server'
import { connectToDatabase } from '@/lib/mongodb'

export async function GET(
  request: NextRequest,
  { params }: { params: Promise<{ alias: string }> }
) {
  try {
    const { alias } = await params
    const { db } = await connectToDatabase()
    const album = await db.collection('albums').findOne(
      { alias },
      {
        projection: {
          _id: 1,
          name: 1,
          alias: 1,
          description: 1,
          isPublic: 1,
          isFeatured: 1,
          storageProvider: 1,
          storagePath: 1,
          parentAlbumId: 1,
          parentPath: 1,
          level: 1,
          order: 1,
          coverPhotoId: 1,
          photoCount: 1,
          firstPhotoDate: 1,
          lastPhotoDate: 1,
          createdAt: 1,
          updatedAt: 1,
          createdBy: 1,
          tags: 1,
          metadata: 1
        }
      }
    )

    if (!album) {
      return NextResponse.json(
        { success: false, error: 'Album not found' },
        { status: 404 }
      )
    }

    // Only return public albums
    if (!album.isPublic) {
      return NextResponse.json(
        { success: false, error: 'Album is private' },
        { status: 403 }
      )
    }
    return NextResponse.json({ success: true, data: album })
  } catch (error) {
    console.error('API: Error getting album by alias:', error)
    return NextResponse.json(
      { success: false, error: 'Failed to get album' },
      { status: 500 }
    )
  }
}
