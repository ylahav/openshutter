import { NextRequest, NextResponse } from 'next/server'
import { connectToDatabase } from '@/lib/mongodb'

export async function POST(request: NextRequest) {
  try {
    const { db } = await connectToDatabase()
    
    // Get all albums
    const albums = await db.collection('albums').find({}).toArray()
    const results = []
    
    for (const album of albums) {
      // Count actual photos in this album
      const actualPhotoCount = await db.collection('photos').countDocuments({
        albumId: album._id,
        isPublished: true
      })
      
      const wasUpdated = album.photoCount !== actualPhotoCount
      
      // Update the album if counts don't match
      if (wasUpdated) {
        await db.collection('albums').updateOne(
          { _id: album._id },
          { 
            $set: { 
              photoCount: actualPhotoCount,
              updatedAt: new Date()
            }
          }
        )
      }
      
      results.push({
        albumId: album._id,
        albumName: album.name,
        albumAlias: album.alias,
        oldCount: album.photoCount,
        newCount: actualPhotoCount,
        wasUpdated
      })
    }
    
    return NextResponse.json({
      success: true,
      message: 'Photo counts recalculated successfully',
      data: {
        totalAlbums: albums.length,
        updatedAlbums: results.filter(r => r.wasUpdated).length,
        results
      }
    })
  } catch (error) {
    console.error('Error fixing photo counts:', error)
    return NextResponse.json(
      { success: false, error: 'Failed to fix photo counts' },
      { status: 500 }
    )
  }
}
