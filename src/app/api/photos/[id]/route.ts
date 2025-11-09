import { NextRequest, NextResponse } from 'next/server'
import { connectToDatabase } from '@/lib/mongodb'
import { connectMongoose } from '@/lib/mongodb'
import { ObjectId } from 'mongodb'
import { storageConfigService } from '@/services/storage/config'
import { ExifExtractor } from '@/services/exif-extractor'
import { PersonModel } from '@/lib/models/Person'
import { TagModel } from '@/lib/models/Tag'
import { LocationModel } from '@/lib/models/Location'

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
      // Connect to Mongoose for model queries
      await connectMongoose()
      
      // Convert tag names to ObjectIds
      const tagIds = []
      for (const tagName of updateData.tags) {
        const tag = await TagModel.findOne({ name: tagName })
        if (tag) {
          // Convert Mongoose ObjectId to native MongoDB ObjectId
          tagIds.push(new ObjectId(String(tag._id)))
        }
      }
      updateFields.tags = tagIds
    }

    // Handle people update
    if (Array.isArray(updateData.people)) {
      // Connect to Mongoose for model queries
      await connectMongoose()
      
      // Convert people names to ObjectIds
      const peopleIds = []
      const notFoundNames = []
      
      for (const personName of updateData.people) {
        if (!personName) {
          console.warn('Invalid person name (empty):', personName)
          continue
        }
        
        // Check if it's already an ObjectId
        if (ObjectId.isValid(personName)) {
          try {
            const person = await PersonModel.findById(personName)
            if (person) {
              // Convert Mongoose ObjectId to native MongoDB ObjectId
              peopleIds.push(new ObjectId(String(person._id)))
              continue
            }
          } catch (err) {
            console.warn('Error looking up person by ID:', personName, err)
          }
        }
        
        // If not an ObjectId or not found by ID, search by name
        if (typeof personName !== 'string') {
          console.warn('Invalid person name (not string):', personName)
          continue
        }
        
        const trimmedName = personName.trim()
        if (!trimmedName) continue
        
        // Search for person by name across all multilingual fields
        // Use substring matching (not exact) to handle variations
        const escapedName = trimmedName.replace(/[.*+?^${}()|[\]\\]/g, '\\$&')
        
        // Try multiple matching strategies:
        // 1. Exact match (case-insensitive)
        // 2. Substring match (in case full name is "John Smith" but we're searching for "John")
        // 3. Word boundary match (to match "John" in "John Smith")
        const person = await PersonModel.findOne({
          $or: [
            // Exact matches
            { 'fullName.en': { $regex: `^${escapedName}$`, $options: 'i' } },
            { 'fullName.he': { $regex: `^${escapedName}$`, $options: 'i' } },
            { 'fullName': { $regex: `^${escapedName}$`, $options: 'i' } },
            { 'firstName.en': { $regex: `^${escapedName}$`, $options: 'i' } },
            { 'firstName.he': { $regex: `^${escapedName}$`, $options: 'i' } },
            { 'firstName': { $regex: `^${escapedName}$`, $options: 'i' } },
            { 'lastName.en': { $regex: `^${escapedName}$`, $options: 'i' } },
            { 'lastName.he': { $regex: `^${escapedName}$`, $options: 'i' } },
            { 'lastName': { $regex: `^${escapedName}$`, $options: 'i' } },
            // Substring matches (for partial name matching)
            { 'fullName.en': { $regex: escapedName, $options: 'i' } },
            { 'fullName.he': { $regex: escapedName, $options: 'i' } },
            { 'fullName': { $regex: escapedName, $options: 'i' } },
            { 'firstName.en': { $regex: escapedName, $options: 'i' } },
            { 'firstName.he': { $regex: escapedName, $options: 'i' } },
            { 'firstName': { $regex: escapedName, $options: 'i' } },
            { 'lastName.en': { $regex: escapedName, $options: 'i' } },
            { 'lastName.he': { $regex: escapedName, $options: 'i' } },
            { 'lastName': { $regex: escapedName, $options: 'i' } }
          ]
        })
        
        if (person) {
          // Convert Mongoose ObjectId to native MongoDB ObjectId
          peopleIds.push(new ObjectId(String(person._id)))
        } else {
          notFoundNames.push(trimmedName)
          console.warn(`Person not found: "${trimmedName}"`)
        }
      }
      
      if (notFoundNames.length > 0) {
        console.warn('People not found:', notFoundNames)
        // If some people weren't found, still update with the ones we found
        // but log a warning - this allows partial updates
      }
      
      // Only update people if we found at least some, or if the array is explicitly empty (to clear)
      if (peopleIds.length > 0 || updateData.people.length === 0) {
        updateFields.people = peopleIds
        console.log(`Converted ${peopleIds.length} people names to IDs out of ${updateData.people.length} provided`)
      } else {
        // If we provided people but found none, that's an error
        console.error('No people found for provided names:', updateData.people)
        return NextResponse.json(
          { 
            success: false, 
            error: `Could not find any of the provided people: ${notFoundNames.join(', ')}` 
          },
          { status: 400 }
        )
      }
    }

    // Handle location update
    if (updateData.location !== undefined) {
      if (updateData.location && updateData.location.name) {
        // Connect to Mongoose for model queries
        await connectMongoose()
        
        // Convert location name to ObjectId
        const location = await LocationModel.findOne({ name: updateData.location.name })
        if (location) {
          // Convert Mongoose ObjectId to native MongoDB ObjectId
          updateFields.location = new ObjectId(String(location._id))
        } else {
          // If location not found, try to use the provided location data
          // But if it has an _id, convert it to native ObjectId
          if (updateData.location._id) {
            updateFields.location = new ObjectId(String(updateData.location._id))
          } else {
            updateFields.location = updateData.location
          }
        }
      } else {
        updateFields.location = updateData.location
      }
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
