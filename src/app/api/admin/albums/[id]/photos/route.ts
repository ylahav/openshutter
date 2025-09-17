import { NextRequest, NextResponse } from 'next/server'
import { connectToDatabase } from '@/lib/mongodb'
import { getCurrentUser } from '@/lib/access-control-server'
import { ObjectId } from 'mongodb'

export async function GET(
  request: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  try {
    const { id } = await params
    
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

    // Get photos from this album (handle both string and ObjectId albumId formats)
    // Admins should see all photos regardless of publication state
    const photos = await db.collection('photos').find({
      $or: [
        { albumId: id },
        { albumId: new ObjectId(id) },
        { $expr: { $eq: [ { $toString: "$albumId" }, id ] } }
      ]
    }).project({
      _id: 1,
      title: 1,
      filename: 1,
      storage: 1,
      metadata: 1,
      dimensions: 1,
      createdAt: 1,
      isPublished: 1,
      isLeading: 1,
      isGalleryLeading: 1
    }).sort({ createdAt: -1 }).toArray()

    // Always also fetch photos from child albums for a complete view
    let childAlbumPhotos = []
    // Get child albums (handle both string and ObjectId parentAlbumId formats)
    const childAlbums = await db.collection('albums').find({
      $or: [
        { parentAlbumId: new ObjectId(id) },
        { parentAlbumId: id }
      ]
    }).toArray()

    // Get photos from each child album (all photos for admin)
    for (const childAlbum of childAlbums) {
      const childPhotos = await db.collection('photos').find({
        $or: [
          { albumId: childAlbum._id },
          { albumId: childAlbum._id.toString() },
          { $expr: { $eq: [ { $toString: "$albumId" }, childAlbum._id.toString() ] } }
        ]
      }).project({
        _id: 1,
        title: 1,
        filename: 1,
        storage: 1,
        metadata: 1,
        dimensions: 1,
        createdAt: 1,
        albumId: 1,
        isPublished: 1,
        isLeading: 1,
        isGalleryLeading: 1
      }).sort({ createdAt: -1 }).toArray()

      childAlbumPhotos.push(...childPhotos.map(photo => ({
        ...photo,
        sourceAlbum: {
          _id: childAlbum._id,
          name: childAlbum.name,
          alias: childAlbum.alias
        }
      })))
    }

    return NextResponse.json({
      success: true,
      data: {
        albumPhotos: photos,
        childAlbumPhotos: childAlbumPhotos,
        totalPhotos: photos.length + childAlbumPhotos.length
      }
    })
  } catch (error) {
    console.error('Error fetching album photos for selection:', error)
    return NextResponse.json(
      { success: false, error: 'Failed to fetch photos' },
      { status: 500 }
    )
  }
}
