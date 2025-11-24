import { NextRequest, NextResponse } from 'next/server'
import { connectToDatabase } from '@/lib/mongodb'
import { getCurrentUser } from '@/lib/access-control-server'
import { ObjectId } from 'mongodb'

export async function PUT(
  request: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  try {
    const { id } = await params
    const { coverPhotoId } = await request.json()

    // Check if user is admin
    const user = await getCurrentUser()
    if (!user || user.role !== 'admin') {
      return NextResponse.json(
        { success: false, error: 'Unauthorized' },
        { status: 401 }
      )
    }

    const { db } = await connectToDatabase()
    
    // Get the album
    const album = await db.collection('albums').findOne({ _id: new ObjectId(id) })
    if (!album) {
      return NextResponse.json(
        { success: false, error: 'Album not found' },
        { status: 404 }
      )
    }

    // If coverPhotoId is provided, verify the photo exists
    if (coverPhotoId) {
      const photo = await db.collection('photos').findOne({
        _id: new ObjectId(coverPhotoId),
        isPublished: true
      })
      
      if (!photo) {
        return NextResponse.json(
          { success: false, error: 'Photo not found' },
          { status: 404 }
        )
      }
    }

    // Update the album's cover photo
    await db.collection('albums').updateOne(
      { _id: new ObjectId(id) },
      { 
        $set: { 
          coverPhotoId: coverPhotoId ? new ObjectId(coverPhotoId) : null,
          updatedAt: new Date()
        }
      }
    )

    // If a cover photo was set, update isLeading flags
    if (coverPhotoId) {
      const coverId = new ObjectId(coverPhotoId)
      
      // Set the new cover photo as leading
      await db.collection('photos').updateOne(
        { _id: coverId },
        { $set: { isLeading: true } }
      )

      // Unset isLeading for all other photos in this album
      // We need to know the albumId of the photo, but we can assume it's in the current album
      // or we can query by the albumId we just updated
      await db.collection('photos').updateMany(
        { 
          albumId: new ObjectId(id), 
          _id: { $ne: coverId } 
        },
        { $set: { isLeading: false } }
      )
    }

    return NextResponse.json({
      success: true,
      message: 'Cover photo updated successfully'
    })
  } catch (error) {
    console.error('Error updating album cover photo:', error)
    return NextResponse.json(
      { success: false, error: 'Failed to update cover photo' },
      { status: 500 }
    )
  }
}
