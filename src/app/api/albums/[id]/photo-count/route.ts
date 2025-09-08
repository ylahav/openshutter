import { NextRequest, NextResponse } from 'next/server'
import { connectToDatabase } from '@/lib/mongodb'
import { ObjectId } from 'mongodb'
import { AlbumPhotoCountService } from '@/services/album-photo-count'

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

    // Verify album exists
    const album = await db.collection('albums').findOne({ _id: objectId })
    if (!album) {
      return NextResponse.json(
        { success: false, error: 'Album not found' },
        { status: 404 }
      )
    }

    // Get total photo count including child albums
    const photoCountResult = await AlbumPhotoCountService.getTotalPhotoCount(objectId)

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
