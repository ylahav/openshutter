import { NextRequest, NextResponse } from 'next/server'
import { connectToDatabase } from '@/lib/mongodb'
import { AlbumPhotoCountService } from '@/services/album-photo-count'

export async function GET(
  request: NextRequest,
  { params }: { params: Promise<{ alias: string }> }
) {
  try {
    const { alias } = await params
    const { db } = await connectToDatabase()
    
    if (!alias) {
      return NextResponse.json(
        { success: false, error: 'Album alias is required' },
        { status: 400 }
      )
    }

    // Find album by alias
    const album = await db.collection('albums').findOne({ alias })
    if (!album) {
      return NextResponse.json(
        { success: false, error: 'Album not found' },
        { status: 404 }
      )
    }

    // Get total photo count including child albums
    const photoCountResult = await AlbumPhotoCountService.getTotalPhotoCount(album._id)

    return NextResponse.json({
      success: true,
      data: photoCountResult
    })
  } catch (error) {
    console.error('Error getting album photo count:', error)
    return NextResponse.json(
      { success: false, error: 'Failed to get album photo count' },
      { status: 500 }
    )
  }
}
