import { NextRequest, NextResponse } from 'next/server'
import { connectToDatabase } from '@/lib/mongodb'
import { connectMongoose } from '@/lib/mongodb'
import { PhotoModel } from '@/lib/models/Photo'
import { PersonModel } from '@/lib/models/Person'
import { TagModel } from '@/lib/models/Tag'
import { LocationModel } from '@/lib/models/Location'
import { ObjectId } from 'mongodb'
import { Types } from 'mongoose'

export async function POST(request: NextRequest) {
  try {
    console.log('Bulk update request received')
    const body = await request.json()
    console.log('Request body:', body)
    const { photoIds, updates } = body

    if (!photoIds || !Array.isArray(photoIds) || photoIds.length === 0) {
      return NextResponse.json({
        success: false,
        error: 'No photo IDs provided'
      }, { status: 400 })
    }

    if (!updates || Object.keys(updates).length === 0) {
      return NextResponse.json({
        success: false,
        error: 'No updates provided'
      }, { status: 400 })
    }

    // Connect to database
    await connectMongoose()

    // Prepare update object
    const updateData: any = {}
    
    if (updates.tags) {
      // Convert tag names to ObjectIds
      const tagIds = []
      for (const tagName of updates.tags) {
        const tag = await TagModel.findOne({ name: tagName })
        if (tag) {
          tagIds.push(tag._id)
        }
      }
      updateData.tags = tagIds
    }
    
    if (updates.people) {
      console.log('Processing people:', updates.people)
      // Convert people names to ObjectIds
      const peopleIds = []
      for (const personName of updates.people) {
        console.log('Looking for person:', personName)
        const person = await PersonModel.findOne({
          $or: [
            { 'fullName.en': personName },
            { 'fullName': personName },
            { 'firstName.en': personName },
            { 'firstName': personName }
          ]
        })
        console.log('Found person:', person)
        if (person) {
          peopleIds.push(person._id)
        }
      }
      console.log('People IDs:', peopleIds)
      updateData.people = peopleIds
    }
    
    if (updates.location !== undefined) {
      if (updates.location && updates.location.name) {
        // Search for location by multilingual name fields
        // Location name is stored as { en?: string; he?: string }
        // The display name from CollectionPopup needs to be matched against these fields
        const locationName = updates.location.name.trim()
        const location = await LocationModel.findOne({
          $or: [
            { 'name.en': locationName },
            { 'name.he': locationName },
            // Also try case-insensitive match
            { 'name.en': { $regex: `^${locationName.replace(/[.*+?^${}()|[\]\\]/g, '\\$&')}$`, $options: 'i' } },
            { 'name.he': { $regex: `^${locationName.replace(/[.*+?^${}()|[\]\\]/g, '\\$&')}$`, $options: 'i' } }
          ]
        })
        
        if (location) {
          // Use Mongoose ObjectId directly (PhotoModel expects Mongoose ObjectIds)
          updateData.location = location._id
        } else {
          // If location not found, try to use the provided location data
          if (updates.location._id) {
            // Convert to Mongoose ObjectId
            try {
              updateData.location = new Types.ObjectId(String(updates.location._id))
            } catch {
              console.warn(`Invalid location ID: ${updates.location._id}`)
              // Skip location update if ID is invalid
            }
          } else {
            // Location doesn't exist - return error to user
            return NextResponse.json({
              success: false,
              error: `Location "${updates.location.name}" not found. Please create the location first or check the name spelling.`
            }, { status: 400 })
          }
        }
      } else {
        // If location is null/undefined, unset it
        updateData.location = null
      }
    }
    
    if (updates.isPublished !== undefined) {
      updateData.isPublished = updates.isPublished
    }
    
    if (updates.isLeading !== undefined) {
      updateData.isLeading = updates.isLeading
    }

    // Check if we have any updates to apply
    if (Object.keys(updateData).length === 0) {
      return NextResponse.json({
        success: false,
        error: 'No valid updates to apply. Please check that tags, people, location, or status fields are provided correctly.'
      }, { status: 400 })
    }

    // Convert photoIds to Mongoose ObjectIds
    const mongoosePhotoIds = photoIds.map((id: string) => {
      try {
        return new Types.ObjectId(id)
      } catch {
        return null
      }
    }).filter(Boolean) as Types.ObjectId[]

    if (mongoosePhotoIds.length === 0) {
      return NextResponse.json({
        success: false,
        error: 'Invalid photo IDs'
      }, { status: 400 })
    }

    // Add updatedAt timestamp
    updateData.updatedAt = new Date()

    console.log('Bulk update data:', {
      photoIds: mongoosePhotoIds.length,
      updateData,
      updateKeys: Object.keys(updateData)
    })

    // Update photos using Mongoose
    const result = await PhotoModel.updateMany(
      { _id: { $in: mongoosePhotoIds } },
      { $set: updateData }
    )

    console.log('Bulk update result:', {
      matchedCount: result.matchedCount,
      modifiedCount: result.modifiedCount
    })

    // Handle isLeading updates for albums
    if (updates.isLeading !== undefined) {
      const { db } = await connectToDatabase()
      const albumsCollection = db.collection('albums')
      
      // Fetch affected photos to get their albumIds
      // We need to cast photoIds to ObjectIds if they are strings
      const objectIds = photoIds.map((id: string) => new ObjectId(id))
      const photos = await db.collection('photos').find({ _id: { $in: objectIds } }).toArray()
      
      for (const photo of photos) {
        if (!photo.albumId) continue
        
        if (updates.isLeading) {
          // Set as cover
          await albumsCollection.updateOne(
            { _id: photo.albumId },
            { $set: { coverPhotoId: photo._id } }
          )

          // Unset isLeading for all other photos in this album
          // Note: If multiple photos from the same album are in this bulk update and all set to isLeading=true,
          // the last one processed will win (race condition in loop, but acceptable for bulk op)
          await db.collection('photos').updateMany(
            { 
              albumId: photo.albumId, 
              _id: { $ne: photo._id } 
            },
            { $set: { isLeading: false } }
          )
        } else {
          // Unset if it was the cover
          await albumsCollection.updateOne(
            { 
              _id: photo.albumId,
              coverPhotoId: photo._id
            },
            { $unset: { coverPhotoId: 1 } }
          )
        }
      }
    }

    return NextResponse.json({
      success: true,
      message: `Successfully updated ${result.modifiedCount} photos`,
      data: {
        modifiedCount: result.modifiedCount,
        matchedCount: result.matchedCount
      }
    })

  } catch (error) {
    console.error('Bulk update error:', error)
    return NextResponse.json({
      success: false,
      error: `Failed to update photos: ${error instanceof Error ? error.message : 'Unknown error'}`
    }, { status: 500 })
  }
}
