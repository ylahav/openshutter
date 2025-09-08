import { NextRequest, NextResponse } from 'next/server'
import { AlbumLeadingPhotoService } from '@/services/album-leading-photo'

export async function POST(request: NextRequest) {
  try {
    const { albumIds } = await request.json()
    
    if (!Array.isArray(albumIds)) {
      return NextResponse.json(
        { success: false, error: 'albumIds must be an array' },
        { status: 400 }
      )
    }

    const coverImages = await AlbumLeadingPhotoService.getMultipleAlbumCoverImageUrls(albumIds)
    
    // Convert Map to object for JSON response
    const result: Record<string, string> = {}
    for (const [albumId, url] of coverImages) {
      result[albumId] = url
    }
    
    return NextResponse.json({
      success: true,
      data: result
    })
  } catch (error) {
    console.error('Error getting album cover images:', error)
    return NextResponse.json(
      { success: false, error: 'Failed to get album cover images' },
      { status: 500 }
    )
  }
}
