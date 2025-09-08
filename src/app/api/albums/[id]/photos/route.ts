import { NextRequest, NextResponse } from 'next/server'
import { connectToDatabase } from '@/lib/mongodb'
import { ObjectId } from 'mongodb'
import { ExifExtractor } from '@/services/exif-extractor'

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

    // Get photos for this album
    const photosCollection = db.collection('photos')
    const photos = await photosCollection
      .find({ albumId: objectId })
      .sort({ uploadedAt: -1 })
      .toArray()

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
