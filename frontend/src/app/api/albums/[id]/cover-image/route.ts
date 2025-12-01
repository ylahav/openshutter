import { NextRequest, NextResponse } from 'next/server'
import { AlbumLeadingPhotoService } from '@/services/album-leading-photo'
import { connectToDatabase } from '@/lib/mongodb'

export async function GET(
  request: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  try {
    const { id } = await params
    
    const result = await AlbumLeadingPhotoService.getAlbumLeadingPhoto(id)
    
    if (result.photo && result.photo.storage?.url) {
      return NextResponse.json({
        success: true,
        data: {
          url: result.photo.storage.url,
          source: result.source,
          albumId: result.albumId,
          photoId: result.photo._id
        }
      })
    }
    
    // Try to get site logo as fallback
    try {
      const { db } = await connectToDatabase()
      const siteConfig = await db.collection('site-configs').findOne({})
      
      if (siteConfig && siteConfig.logo) {
        return NextResponse.json({
          success: true,
          data: {
            url: siteConfig.logo,
            source: 'site-logo',
            albumId: id,
            photoId: null
          }
        })
      }
    } catch (error) {
      console.error('Error fetching site logo:', error)
    }
    
    return NextResponse.json({
      success: false,
      error: 'No cover image found',
      data: {
        url: '/api/placeholder/400/300',
        source: 'placeholder',
        albumId: id,
        photoId: null
      }
    })
  } catch (error) {
    console.error('Error getting album cover image:', error)
    return NextResponse.json(
      { success: false, error: 'Failed to get album cover image' },
      { status: 500 }
    )
  }
}
