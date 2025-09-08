import { NextRequest, NextResponse } from 'next/server'
import { connectToDatabase } from '@/lib/mongodb'
import { ExifExtractor } from '@/services/exif-extractor'

export async function GET(request: NextRequest) {
  try {
    const { db } = await connectToDatabase()
    const { searchParams } = new URL(request.url)
    
    const limit = parseInt(searchParams.get('limit') || '5')
    
    // Get photos marked as gallery leading
    const photosCollection = db.collection('photos')
    const photos = await photosCollection
      .find({ 
        isGalleryLeading: true,
        isPublished: true 
      })
      .sort({ uploadedAt: -1 })
      .limit(limit)
      .toArray()

    // Process photos for EXIF data extraction (on-demand)
    const processedPhotos = await ExifExtractor.processPhotosForExif(photos)

    return NextResponse.json({
      success: true,
      data: processedPhotos
    })
  } catch (error) {
    console.error('Failed to get gallery leading photos:', error)
    return NextResponse.json(
      { success: false, error: 'Failed to get gallery leading photos' },
      { status: 500 }
    )
  }
}
