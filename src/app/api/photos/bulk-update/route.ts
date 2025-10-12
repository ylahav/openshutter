import { NextRequest, NextResponse } from 'next/server'
import { connectToDatabase } from '@/lib/mongodb'
import { connectMongoose } from '@/lib/mongodb'
import { PhotoModel } from '@/lib/models/Photo'
import { PersonModel } from '@/lib/models/Person'
import { TagModel } from '@/lib/models/Tag'
import { LocationModel } from '@/lib/models/Location'

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
    
    if (updates.location) {
      // Convert location name to ObjectId
      const location = await LocationModel.findOne({ name: updates.location.name })
      if (location) {
        updateData.location = {
          ...updates.location,
          _id: location._id
        }
      } else {
        updateData.location = updates.location
      }
    }
    
    if (updates.isPublished !== undefined) {
      updateData.isPublished = updates.isPublished
    }
    
    if (updates.isLeading !== undefined) {
      updateData.isLeading = updates.isLeading
    }

    // Update photos
    const result = await PhotoModel.updateMany(
      { _id: { $in: photoIds } },
      { $set: updateData }
    )

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
