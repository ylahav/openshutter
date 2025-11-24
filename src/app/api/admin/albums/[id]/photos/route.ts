import { NextRequest, NextResponse } from 'next/server'
import { connectToDatabase } from '@/lib/mongodb'
import { ObjectId } from 'mongodb'
import { ExifExtractor } from '@/services/exif-extractor'
import { getCurrentUser } from '@/lib/access-control-server'

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

    // Check if user is admin
    const user = await getCurrentUser()
    console.log('Admin Photos API: User check:', {
      user: user ? { id: user.id, role: user.role } : 'null',
      isAdmin: user?.role === 'admin'
    })
    
    if (!user || user.role !== 'admin') {
      console.log('Admin Photos API: Access denied - not admin')
      return NextResponse.json(
        { success: false, error: 'Admin access required' },
        { status: 403 }
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

    // Get ALL photos for this album (including unpublished) - admin only
    const photosCollection = db.collection('photos')
    console.log(`Admin Photos API: Looking for ALL photos with albumId: ${id} or ObjectId: ${objectId}`)
    
    const query = { 
      $or: [
        { albumId: objectId },
        { albumId: id }
      ]
    }
    
    console.log(`Admin Photos API: Query:`, JSON.stringify(query, null, 2))
    
    const photos = await photosCollection
      .find(query)
      .sort({ uploadedAt: -1 })
      .toArray()
    
    // If includeSubAlbums is requested, fetch photos from child albums
    const { searchParams } = new URL(request.url)
    const includeSubAlbums = searchParams.get('includeSubAlbums') === 'true'
    
    if (includeSubAlbums) {
      console.log(`Admin Photos API: Fetching photos from sub-albums for ${id}`)
      
      // Find child albums
      const childAlbums = await db.collection('albums').find({
        $or: [
          { parentAlbumId: objectId },
          { parentAlbumId: id }
        ]
      }).toArray()
      
      if (childAlbums.length > 0) {
        const childAlbumIds = childAlbums.map(a => a._id)
        const childAlbumIdsStr = childAlbums.map(a => a._id.toString())
        
        // Fetch photos from child albums
        const childPhotos = await photosCollection.find({
          $or: [
            { albumId: { $in: childAlbumIds } },
            { albumId: { $in: childAlbumIdsStr } }
          ]
        })
        .sort({ uploadedAt: -1 })
        .limit(100) // Limit to prevent overwhelming response
        .toArray()
        
        // Add source album info to child photos
        const albumMap = new Map(childAlbums.map(a => [a._id.toString(), a]))
        
        const childPhotosWithSource = childPhotos.map(photo => {
          const sourceAlbum = photo.albumId ? albumMap.get(photo.albumId.toString()) : null
          return {
            ...photo,
            sourceAlbum: sourceAlbum ? {
              _id: sourceAlbum._id,
              name: sourceAlbum.name,
              alias: sourceAlbum.alias
            } : null
          }
        })
        
        // Combine photos
        photos.push(...childPhotosWithSource)
      }
    }
    
    console.log(`Admin Photos API: Found ${photos.length} photos for album ${id} (including unpublished)`)
    if (photos.length > 0) {
      console.log('Admin Photos API: First photo sample:', {
        _id: photos[0]._id,
        filename: photos[0].filename,
        albumId: photos[0].albumId,
        isPublished: photos[0].isPublished,
        storage: photos[0].storage
      })
    } else {
      console.log('Admin Photos API: No photos found - checking if album exists...')
      const albumCollection = db.collection('albums')
      const album = await albumCollection.findOne({ _id: objectId })
      console.log('Admin Photos API: Album exists:', !!album, album ? { _id: album._id, alias: album.alias } : null)
    }

    // Process photos for EXIF data extraction (on-demand)
    const processedPhotos = await ExifExtractor.processPhotosForExif(photos)

    return NextResponse.json({
      success: true,
      data: processedPhotos
    })
  } catch (error) {
    console.error('Failed to get admin album photos:', error)
    return NextResponse.json(
      { success: false, error: 'Failed to get admin album photos' },
      { status: 500 }
    )
  }
}
