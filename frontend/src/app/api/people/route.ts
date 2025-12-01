import { NextRequest, NextResponse } from 'next/server'
import { connectToDatabase, connectMongoose } from '@/lib/mongodb'
import { getCurrentUser } from '@/lib/access-control-server'
import { PersonModel } from '@/lib/models/Person'
import { SUPPORTED_LANGUAGES } from '@/types/multi-lang'
import { TagModel } from '@/lib/models/Tag'
import { ObjectId } from 'mongodb'

export async function GET(request: NextRequest) {
  console.log('People API called')
  try {
    const { searchParams } = new URL(request.url)
    
    // Get query parameters
    const search = searchParams.get('search')
    const page = parseInt(searchParams.get('page') || '1')
    const limit = parseInt(searchParams.get('limit') || '20')
    const isActive = searchParams.get('isActive')
    
    // Get current user for access control
    const user = await getCurrentUser()
    const isPublicOnly = !user
    
    // Connect to database and ensure Mongoose is connected
    await connectMongoose()
    const { db } = await connectToDatabase()
    
    // Build query
    const query: any = {}
    
    if (search) {
      const langs = SUPPORTED_LANGUAGES.map(l => l.code)
      const fields = ['firstName', 'lastName', 'fullName', 'nickname', 'description']
      query.$or = fields.flatMap(f => langs.map(code => ({ [`${f}.${code}`]: { $regex: search, $options: 'i' } })))
    }
    
    if (isActive !== null) {
      query.isActive = isActive === 'true'
    }
    
    // Get people with pagination
    const skip = (page - 1) * limit
    let [people, total] = await Promise.all([
      PersonModel.find(query)
        .sort({ fullName: 1 })
        .skip(skip)
        .limit(limit)
        .lean(),
      PersonModel.countDocuments(query)
    ])
    
    // If public only, filter to people tagged in published photos in public albums
    if (isPublicOnly) {
      // Get all public album IDs (handle both ObjectId and string formats)
      const publicAlbums = await db.collection('albums').find(
        { isPublic: true },
        { projection: { _id: 1 } }
      ).toArray()
      const publicAlbumIds = publicAlbums.map((a: any) => {
        const id = a._id
        return id instanceof ObjectId ? id : new ObjectId(String(id))
      })
      const publicAlbumIdStrings = publicAlbumIds.map((id: any) => String(id))
      
      // Get all people IDs tagged in published photos that are in public albums
      // Handle both ObjectId and string albumId formats
      const publicPhotoPeople = await db.collection('photos').distinct('people', {
        isPublished: true,
        $or: [
          { albumId: { $in: publicAlbumIds } },
          { albumId: { $in: publicAlbumIdStrings } }
        ],
        people: { $exists: true, $ne: [] }
      })
      
      // Normalize people IDs to strings for comparison
      const publicPeopleIds = [...new Set(
        publicPhotoPeople.map((id: any) => {
          if (id instanceof ObjectId) return id.toString()
          return String(id)
        })
      )]
      
      // Filter people to only those tagged in public photos
      people = people.filter((person: any) => {
        const personIdStr = person._id instanceof ObjectId ? person._id.toString() : String(person._id)
        return publicPeopleIds.includes(personIdStr)
      })
      total = people.length
    }
    
    console.log('People API - Query and Results:', {
      query,
      total,
      peopleCount: people.length,
      people: people.map(p => ({
        _id: p._id,
        firstName: p.firstName,
        lastName: p.lastName,
        fullName: p.fullName,
        isActive: p.isActive
      }))
    })

    // Get all unique tag IDs from people
    const tagIds = [...new Set(people.flatMap(person => person.tags || []))]
    
    // Fetch tags separately
    const tags = tagIds.length > 0 ? await TagModel.find({ _id: { $in: tagIds } }).lean() : []
    const tagsMap = new Map(tags.map((tag: any) => [String(tag._id), tag]))

    // Add tag data to people and convert old string format to MultiLangText format for compatibility
    const peopleWithTags = people.map(person => {
      const firstName = typeof (person as any).firstName === 'string' 
        ? { en: (person as any).firstName, he: '' } 
        : (person as any).firstName
      
      const lastName = typeof (person as any).lastName === 'string' 
        ? { en: (person as any).lastName, he: '' } 
        : ((person as any).lastName || (person as any).familyName || { en: '', he: '' })
      
      // Generate fullName from firstName and lastName
      const fullName = {
        en: `${firstName.en || ''} ${lastName.en || ''}`.trim(),
        he: `${firstName.he || ''} ${lastName.he || ''}`.trim()
      }
      
      return {
        ...person,
        firstName,
        lastName,
        fullName,
        tags: (person.tags || []).map((tagId: any) => tagsMap.get(String(tagId))).filter(Boolean),
        nickname: typeof (person as any).nickname === 'string' 
          ? { en: (person as any).nickname, he: '' } 
          : ((person as any).nickname || {}),
        description: typeof (person as any).description === 'string' 
          ? { en: (person as any).description, he: '' } 
          : ((person as any).description || {})
      }
    })
    
    return NextResponse.json({
      success: true,
      data: peopleWithTags,
      pagination: {
        page,
        limit,
        total,
        pages: Math.ceil(total / limit)
      }
    })
    
  } catch (error) {
    console.error('People API error:', error)
    console.error('Error details:', {
      message: error instanceof Error ? error.message : 'Unknown error',
      stack: error instanceof Error ? error.stack : undefined,
      name: error instanceof Error ? error.name : undefined
    })
    return NextResponse.json(
      { success: false, error: 'Failed to fetch people' },
      { status: 500 }
    )
  }
}

export async function POST(request: NextRequest) {
  try {
    // Get current user for access control
    const user = await getCurrentUser()
    if (!user) {
      return NextResponse.json({ success: false, error: 'Unauthorized' }, { status: 401 })
    }
    
    // Connect to database and ensure Mongoose is connected
    await connectMongoose()
    
    const body = await request.json()
    const { firstName, lastName, nickname, birthDate, description, tags } = body
    
    // Validate required fields
    const anyFirst = typeof firstName === 'string'
      ? !!firstName.trim()
      : Object.values((firstName as Record<string, string>) || {}).some((v) => (v || '').trim())
    const anyLast = typeof lastName === 'string'
      ? !!lastName.trim()
      : Object.values((lastName as Record<string, string>) || {}).some((v) => (v || '').trim())
    if (!anyFirst || !anyLast) {
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
    
    // Generate fullName from firstName and lastName for comparison
    const langs = SUPPORTED_LANGUAGES.map(l => l.code)
    const fullNamesByLang = langs.reduce((acc: any, code: string) => {
      const fn = typeof firstName === 'object' ? (firstName as any)[code] || '' : ''
      const ln = typeof lastName === 'object' ? (lastName as any)[code] || '' : ''
      const combined = `${(fn || '').trim()} ${(ln || '').trim()}`.trim()
      if (combined) acc[code] = combined
      return acc
    }, {})
    
    // Check if person already exists (check by exact full name match)
    const duplicateConditions = []
    
    // Only check for English full name if it's not empty
    for (const code of Object.keys(fullNamesByLang)) {
      duplicateConditions.push({ [`fullName.${code}`]: (fullNamesByLang as any)[code] })
    }
    
    // If no valid full names to check, skip duplicate check
    if (duplicateConditions.length === 0) {
      console.log('No valid full names to check for duplicates')
    } else {
      const duplicateQuery = { $or: duplicateConditions }
      
      console.log('Duplicate check query:', duplicateQuery)
      console.log('Looking for fullNames:', fullNamesByLang)
      
      const existingPerson = await PersonModel.findOne(duplicateQuery)
      
      if (existingPerson) {
        console.log('Person creation blocked - existing person found:', {
          existingPerson: {
            _id: existingPerson._id,
            firstName: existingPerson.firstName,
            lastName: existingPerson.lastName,
            fullName: existingPerson.fullName,
            isActive: existingPerson.isActive
          },
          newPerson: {
            firstName,
            lastName,
            fullNames: fullNamesByLang
          }
        })
        return NextResponse.json(
          { success: false, error: 'Person with this name already exists' },
          { status: 409 }
        )
      }
    }
    
    // Generate fullName from firstName and lastName
    const fullName = fullNamesByLang
    
    // Create new person
    const person = new PersonModel({
      firstName,
      lastName,
      fullName,
      nickname: nickname || {},
      birthDate: birthDate ? new Date(birthDate) : undefined,
      description: description || {},
      tags: tagObjectIds,
      createdBy: user.id
    })
    
    await person.save()
    
    return NextResponse.json({
      success: true,
      data: person
    })
    
  } catch (error) {
    console.error('Create person error:', error)
    return NextResponse.json(
      { success: false, error: 'Failed to create person' },
      { status: 500 }
    )
  }
}
