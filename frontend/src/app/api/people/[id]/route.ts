import { NextRequest, NextResponse } from 'next/server'
import { connectToDatabase, connectMongoose } from '@/lib/mongodb'
import { getCurrentUser } from '@/lib/access-control-server'
import { PersonModel } from '@/lib/models/Person'
import { TagModel } from '@/lib/models/Tag'
import { ObjectId } from 'mongodb'

export async function GET(
  request: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  try {
    const { id } = await params
    
    // Get current user for access control
    const user = await getCurrentUser()
    if (!user) {
      return NextResponse.json({ success: false, error: 'Unauthorized' }, { status: 401 })
    }
    
    // Connect to database and ensure Mongoose is connected
    await connectMongoose()
    const { db } = await connectToDatabase()
    
    // Validate ObjectId
    if (!ObjectId.isValid(id)) {
      return NextResponse.json(
        { success: false, error: 'Invalid person ID' },
        { status: 400 }
      )
    }
    
    const person = await PersonModel.findById(id).lean()
    
    if (!person) {
      return NextResponse.json(
        { success: false, error: 'Person not found' },
        { status: 404 }
      )
    }

    // Fetch tags separately
    const tagIds = Array.isArray((person as any).tags) ? (person as any).tags : []
    const tags = tagIds.length > 0 ? await TagModel.find({ _id: { $in: tagIds } }).lean() : []
    const tagsMap = new Map(tags.map((tag: any) => [String(tag._id), tag]))

    // Add tag data to person
    const personWithTags = {
      ...person,
      tags: tagIds.map((tagId: any) => tagsMap.get(String(tagId))).filter(Boolean)
    }

    // Convert to consistent format
    const firstName = typeof (personWithTags as any).firstName === 'string' 
      ? { en: (personWithTags as any).firstName, he: '' } 
      : (personWithTags as any).firstName

    const lastName = typeof (personWithTags as any).lastName === 'string' 
      ? { en: (personWithTags as any).lastName, he: '' } 
      : ((personWithTags as any).lastName || (personWithTags as any).familyName || { en: '', he: '' })

    // Generate fullName from firstName and lastName
    const fullName = {
      en: `${firstName.en || ''} ${lastName.en || ''}`.trim(),
      he: `${firstName.he || ''} ${lastName.he || ''}`.trim()
    }

    const convertedPerson = {
      ...personWithTags,
      firstName,
      lastName,
      fullName,
      nickname: typeof (personWithTags as any).nickname === 'string' 
        ? { en: (personWithTags as any).nickname, he: '' } 
        : ((personWithTags as any).nickname || {}),
      description: typeof (personWithTags as any).description === 'string' 
        ? { en: (personWithTags as any).description, he: '' } 
        : ((personWithTags as any).description || {})
    }
    
    return NextResponse.json({
      success: true,
      data: convertedPerson
    })
    
  } catch (error) {
    console.error('Get person error:', error)
    return NextResponse.json(
      { success: false, error: 'Failed to fetch person' },
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
    
    // Get current user for access control
    const user = await getCurrentUser()
    if (!user) {
      return NextResponse.json({ success: false, error: 'Unauthorized' }, { status: 401 })
    }
    
    // Connect to database and ensure Mongoose is connected
    await connectMongoose()
    const { db } = await connectToDatabase()
    
    // Validate ObjectId
    if (!ObjectId.isValid(id)) {
      return NextResponse.json(
        { success: false, error: 'Invalid person ID' },
        { status: 400 }
      )
    }
    
    const body = await request.json()
    const { firstName, lastName, nickname, birthDate, description, tags, isActive } = body
    
    // Validate required fields
    if (!firstName || !lastName || 
        !firstName.en || !lastName.en || 
        (!firstName.en.trim() && !firstName.he?.trim()) || 
        (!lastName.en.trim() && !lastName.he?.trim())) {
      return NextResponse.json(
        { success: false, error: 'First name and last name are required in at least one language' },
        { status: 400 }
      )
    }
    
    // Convert tag strings to ObjectIds
    let tagObjectIds = []
    if (tags && tags.length > 0) {
      const { TagModel } = await import('@/lib/models/Tag')
      for (const tagName of tags) {
        let tag = await TagModel.findOne({ name: tagName.trim() })
        if (!tag) {
          tag = await TagModel.create({ 
            name: tagName.trim(), 
            createdBy: user.id 
          })
        }
        tagObjectIds.push(tag._id)
      }
    }
    
    // Check if person exists
    const existingPerson = await PersonModel.findById(id)
    if (!existingPerson) {
      return NextResponse.json(
        { success: false, error: 'Person not found' },
        { status: 404 }
      )
    }
    
    // Check if another person with same name exists (excluding current person)
    const duplicatePerson = await PersonModel.findOne({
      $or: [
        { 'firstName.en': firstName.en?.trim() },
        { 'firstName.he': firstName.he?.trim() },
        { 'lastName.en': lastName.en?.trim() },
        { 'lastName.he': lastName.he?.trim() }
      ],
      _id: { $ne: id }
    })
    
    if (duplicatePerson) {
      return NextResponse.json(
        { success: false, error: 'Person with this name already exists' },
        { status: 409 }
      )
    }
    
    // Generate fullName from firstName and lastName
    const fullName = {
      en: `${firstName.en || ''} ${lastName.en || ''}`.trim(),
      he: `${firstName.he || ''} ${lastName.he || ''}`.trim()
    }
    
    // Update person
    const updatedPerson = await PersonModel.findByIdAndUpdate(
      id,
      {
        firstName,
        lastName,
        fullName,
        nickname: nickname || {},
        birthDate: birthDate ? new Date(birthDate) : undefined,
        description: description || {},
        tags: tagObjectIds,
        isActive: isActive !== undefined ? isActive : true
      },
      { new: true, runValidators: true }
    )
    
    return NextResponse.json({
      success: true,
      data: updatedPerson
    })
    
  } catch (error) {
    console.error('Update person error:', error)
    return NextResponse.json(
      { success: false, error: 'Failed to update person' },
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
    
    // Get current user for access control
    const user = await getCurrentUser()
    if (!user) {
      return NextResponse.json({ success: false, error: 'Unauthorized' }, { status: 401 })
    }
    
    // Connect to database and ensure Mongoose is connected
    await connectMongoose()
    const { db } = await connectToDatabase()
    
    // Validate ObjectId
    if (!ObjectId.isValid(id)) {
      return NextResponse.json(
        { success: false, error: 'Invalid person ID' },
        { status: 400 }
      )
    }
    
    // Check if person exists
    const person = await PersonModel.findById(id)
    if (!person) {
      return NextResponse.json(
        { success: false, error: 'Person not found' },
        { status: 404 }
      )
    }
    
    // Check if person is referenced in any photos
    const photoCount = await db.collection('photos').countDocuments({
      people: new ObjectId(id)
    })
    
    if (photoCount > 0) {
      return NextResponse.json(
        { 
          success: false, 
          error: `Cannot delete person. They are referenced in ${photoCount} photo(s). Please remove them from photos first.` 
        },
        { status: 409 }
      )
    }
    
    // Delete person
    await PersonModel.findByIdAndDelete(id)
    
    return NextResponse.json({
      success: true,
      message: 'Person deleted successfully'
    })
    
  } catch (error) {
    console.error('Delete person error:', error)
    return NextResponse.json(
      { success: false, error: 'Failed to delete person' },
      { status: 500 }
    )
  }
}
