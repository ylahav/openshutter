import { NextRequest, NextResponse } from 'next/server'
import { connectToDatabase } from '@/lib/mongodb'
import { ObjectId } from 'mongodb'
import { storageConfigService } from '@/services/storage/config'
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
        { success: false, error: 'Photo ID is required' },
        { status: 400 }
      )
    }

    let objectId
    try {
      objectId = new ObjectId(id)
    } catch (error) {
      return NextResponse.json(
        { success: false, error: 'Invalid photo ID format' },
        { status: 400 }
      )
    }

    const photosCollection = db.collection('photos')
    const photo = await photosCollection.findOne({ _id: objectId })

    if (!photo) {
      return NextResponse.json(
        { success: false, error: 'Photo not found' },
        { status: 404 }
      )
    }

    // Process photo for EXIF data extraction (on-demand)
    const processedPhoto = await ExifExtractor.extractAndUpdateExif(photo)

    return NextResponse.json({ success: true, data: processedPhoto })
  } catch (error) {
    console.error('Failed to get photo:', error)
    return NextResponse.json(
      { success: false, error: 'Failed to get photo' },
      { status: 500 }
    )
  }
}

export async function PUT(
  request: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  try {
    const { id } = await params
    const updateData = await request.json()
    const { db } = await connectToDatabase()
    
    if (!id) {
      return NextResponse.json(
        { success: false, error: 'Photo ID is required' },
        { status: 400 }
      )
    }

    let objectId
    try {
      objectId = new ObjectId(id)
    } catch (error) {
      return NextResponse.json(
        { success: false, error: 'Invalid photo ID format' },
        { status: 400 }
      )
    }

    const photosCollection = db.collection('photos')
    
    // Check if photo exists
    const existingPhoto = await photosCollection.findOne({ _id: objectId })
    if (!existingPhoto) {
      return NextResponse.json(
        { success: false, error: 'Photo not found' },
        { status: 404 }
      )
    }

    // Prepare update data
    const updateFields: any = {
      updatedAt: new Date()
    }

    // Handle title update
    if (updateData.title) {
      updateFields.title = updateData.title
    }

    // Handle description update
    if (updateData.description) {
      updateFields.description = updateData.description
    }

    // Handle isPublished update
    if (typeof updateData.isPublished === 'boolean') {
      updateFields.isPublished = updateData.isPublished
    }

    // Handle isLeading update
    if (typeof updateData.isLeading === 'boolean') {
      updateFields.isLeading = updateData.isLeading
    }

    // Handle isGalleryLeading update
    if (typeof updateData.isGalleryLeading === 'boolean') {
      updateFields.isGalleryLeading = updateData.isGalleryLeading
    }

    // Handle tags update
    if (Array.isArray(updateData.tags)) {
      updateFields.tags = updateData.tags
    }

    // Handle people update
    if (Array.isArray(updateData.people)) {
      updateFields.people = updateData.people
    }

    // Handle location update
    if (updateData.location !== undefined) {
      updateFields.location = updateData.location
    }

    // Update the photo
    const result = await photosCollection.updateOne(
      { _id: objectId },
      { $set: updateFields }
    )

    if (result.matchedCount === 0) {
      return NextResponse.json(
        { success: false, error: 'Photo not found' },
        { status: 404 }
      )
    }

    // Return the updated photo
    const updatedPhoto = await photosCollection.findOne({ _id: objectId })
    return NextResponse.json({ success: true, data: updatedPhoto })
  } catch (error) {
    console.error('Failed to update photo:', error)
    return NextResponse.json(
      { success: false, error: 'Failed to update photo' },
      { status: 500 }
    )
  }
}

export async function DELETE(
  request: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  try {
    const { id } = await params
    // Always delete from storage when removing a photo
    const deleteFromStorage = true
    const { db } = await connectToDatabase()
    
    if (!id) {
      return NextResponse.json(
        { success: false, error: 'Photo ID is required' },
        { status: 400 }
      )
    }

    let objectId
    try {
      objectId = new ObjectId(id)
    } catch (error) {
      return NextResponse.json(
        { success: false, error: 'Invalid photo ID format' },
        { status: 400 }
      )
    }

    const photosCollection = db.collection('photos')
    
    // Get photo details before deletion for cleanup
    const photo = await photosCollection.findOne({ _id: objectId })
    if (!photo) {
      return NextResponse.json(
        { success: false, error: 'Photo not found' },
        { status: 404 }
      )
    }

    // Delete the photo from database
    const result = await photosCollection.deleteOne({ _id: objectId })

    if (result.deletedCount === 0) {
      return NextResponse.json(
        { success: false, error: 'Photo not found' },
        { status: 404 }
      )
    }

    // Update album photo count if photo was in an album
    if (photo.albumId) {
      const albumsCollection = db.collection('albums')
      await albumsCollection.updateOne(
        { _id: photo.albumId },
        { $inc: { photoCount: -1 } }
      )
      
      // If this was the album cover, unset it
      if (photo.isAlbumCover) {
        await albumsCollection.updateOne(
          { _id: photo.albumId },
          { $unset: { coverPhotoId: 1 } }
        )
      }
    }

    // Delete physical files from storage
    if (deleteFromStorage && photo.storage) {
      try {
        // For local storage, delete files directly
        if (photo.storage.provider === 'local') {
          const fs = require('fs/promises')
          const path = require('path')
          
          // Get local storage configuration
          const localConfig = await storageConfigService.getConfig('local')
          if (!localConfig) {
            console.error('Local storage configuration not found')
            return NextResponse.json(
              { success: false, error: 'Storage configuration not found' },
              { status: 500 }
            )
          }
          
          const basePath = localConfig.config.basePath
          
          // Helper to resolve relative -> absolute path under basePath
          const resolveAbs = (relative: string) => (
            path.isAbsolute(basePath)
              ? path.join(basePath, relative)
              : path.join(process.cwd(), basePath, relative)
          )

          // Prefer deleting by storage.path (source of truth)
          if (photo.storage.path) {
            try { await fs.unlink(resolveAbs(photo.storage.path)) } catch (err) { console.error('Delete storage.path failed:', err) }
          }

          // Fallback delete by storage.url if present
          if (photo.storage.url) {
            let photoPath = photo.storage.url
            if (photoPath.startsWith('/api/storage/serve/local/')) photoPath = photoPath.replace('/api/storage/serve/local/', '')
            else if (photoPath.startsWith('/api/storage/local/')) photoPath = photoPath.replace('/api/storage/local/', '')
            const decodedPhotoPath = decodeURIComponent(photoPath)
            try { await fs.unlink(resolveAbs(decodedPhotoPath)) } catch (err) { /* ignore if already removed */ }
          }
          
          // Delete legacy single thumbnail
          if (photo.storage.thumbnailPath) {
            // Extract relative path from thumbnail URL (handle both old and new formats)
            let thumbnailPath = photo.storage.thumbnailPath
            if (thumbnailPath.startsWith('/api/storage/serve/local/')) {
              thumbnailPath = thumbnailPath.replace('/api/storage/serve/local/', '')
            } else if (thumbnailPath.startsWith('/api/storage/local/')) {
              thumbnailPath = thumbnailPath.replace('/api/storage/local/', '')
            }
            const decodedThumbnailPath = decodeURIComponent(thumbnailPath)
            try { await fs.unlink(resolveAbs(decodedThumbnailPath)) } catch (err) { /* ignore */ }
          }

          // Delete thumbnails map if present
          if (photo.storage.thumbnails && typeof photo.storage.thumbnails === 'object') {
            for (const key of Object.keys(photo.storage.thumbnails)) {
              const thumbUrl = photo.storage.thumbnails[key]
              if (typeof thumbUrl !== 'string') continue
              let rel = thumbUrl
              if (rel.startsWith('/api/storage/serve/local/')) rel = rel.replace('/api/storage/serve/local/', '')
              else if (rel.startsWith('/api/storage/local/')) rel = rel.replace('/api/storage/local/', '')
              const decodedRel = decodeURIComponent(rel)
              try { await fs.unlink(resolveAbs(decodedRel)) } catch { /* ignore */ }
            }
          }
        }
        // TODO: Add support for other storage providers when needed
      } catch (storageError) {
        console.error('Failed to delete files from storage:', storageError)
        // Continue with database deletion even if storage deletion fails
      }
    }

    return NextResponse.json({
      success: true,
      message: 'Photo deleted successfully'
    })
  } catch (error) {
    console.error('Failed to delete photo:', error)
    return NextResponse.json(
      { success: false, error: 'Failed to delete photo' },
      { status: 500 }
    )
  }
}
