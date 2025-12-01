import { NextRequest, NextResponse } from 'next/server'
import { connectToDatabase } from '@/lib/mongodb'
import { getCurrentUser } from '@/lib/access-control-server'
import { TagModel } from '@/lib/models/Tag'
import { ObjectId } from 'mongodb'

export async function GET(request: NextRequest) {
  try {
    const { searchParams } = new URL(request.url)
    const { db } = await connectToDatabase()
    
    // Get query parameters
    const search = searchParams.get('search')
    const page = parseInt(searchParams.get('page') || '1')
    const limit = parseInt(searchParams.get('limit') || '20')
    const category = searchParams.get('category')
    const isActive = searchParams.get('isActive')
    const sortBy = searchParams.get('sortBy') || 'usageCount'
    const sortOrder = searchParams.get('sortOrder') || 'desc'
    
    // Get current user for access control
    const user = await getCurrentUser()
    const isPublicOnly = !user
    
    // Build query
    const query: any = {}
    
    if (search) {
      query.$text = { $search: search }
    }
    
    if (category) {
      query.category = category
    }
    
    if (isActive !== null) {
      query.isActive = isActive === 'true'
    }
    
    // Build sort object
    const sort: any = {}
    sort[sortBy] = sortOrder === 'asc' ? 1 : -1
    
    // Get tags with pagination
    const skip = (page - 1) * limit
    let [tags, total] = await Promise.all([
      TagModel.find(query)
        .sort(sort)
        .skip(skip)
        .limit(limit)
        .lean(),
      TagModel.countDocuments(query)
    ])
    
    // If public only, filter to tags used in published photos in public albums
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
      
      console.log('Tags API - Public filtering:', {
        publicAlbumsCount: publicAlbums.length,
        publicAlbumIds: publicAlbumIds.length,
        publicAlbumIdStrings: publicAlbumIdStrings.length
      })
      
      // Get all tag IDs used in published photos that are in public albums
      // Handle both ObjectId and string albumId formats
      const publicPhotoTags = await db.collection('photos').distinct('tags', {
        isPublished: true,
        $or: [
          { albumId: { $in: publicAlbumIds } },
          { albumId: { $in: publicAlbumIdStrings } }
        ],
        tags: { $exists: true, $ne: [] }
      })
      
      // Get all tag IDs used in public albums
      const publicAlbumTags = await db.collection('albums').distinct('tags', {
        isPublic: true,
        tags: { $exists: true, $ne: [] }
      })
      
      console.log('Tags API - Found tags:', {
        publicPhotoTagsCount: publicPhotoTags.length,
        publicAlbumTagsCount: publicAlbumTags.length,
        publicPhotoTags: publicPhotoTags.slice(0, 5).map((id: any) => String(id)),
        publicAlbumTags: publicAlbumTags.slice(0, 5).map((id: any) => String(id))
      })
      
      // Combine and get unique tag IDs (normalize to strings for comparison)
      const allPublicTagIds = [...publicPhotoTags, ...publicAlbumTags]
      const publicTagIds = [...new Set(
        allPublicTagIds.map((id: any) => {
          if (id instanceof ObjectId) return id.toString()
          return String(id)
        })
      )]
      
      console.log('Tags API - Filtering tags:', {
        allTagsCount: tags.length,
        publicTagIdsCount: publicTagIds.length,
        publicTagIds: publicTagIds.slice(0, 10)
      })
      
      // Filter tags to only those used in public content
      // Compare tag._id (which is a Mongoose ObjectId) with public tag IDs
      tags = tags.filter((tag: any) => {
        const tagIdStr = tag._id instanceof ObjectId ? tag._id.toString() : String(tag._id)
        return publicTagIds.includes(tagIdStr)
      })
      total = tags.length
      
      console.log('Tags API - Final result:', {
        filteredTagsCount: tags.length,
        total
      })
    }
    
    return NextResponse.json({
      success: true,
      data: tags,
      pagination: {
        page,
        limit,
        total,
        pages: Math.ceil(total / limit)
      }
    })
    
  } catch (error) {
    console.error('Tags API error:', error)
    return NextResponse.json(
      { success: false, error: 'Failed to fetch tags' },
      { status: 500 }
    )
  }
}

export async function POST(request: NextRequest) {
  try {
    const { db } = await connectToDatabase()
    
    // Get current user for access control
    const user = await getCurrentUser()
    if (!user) {
      return NextResponse.json({ success: false, error: 'Unauthorized' }, { status: 401 })
    }
    
    const body = await request.json()
    const { name, description, color, category } = body
    
    // Validate required fields
    if (!name) {
      return NextResponse.json(
        { success: false, error: 'Tag name is required' },
        { status: 400 }
      )
    }
    
    // Check if tag already exists
    const existingTag = await TagModel.findOne({
      name: name.trim()
    })
    
    if (existingTag) {
      return NextResponse.json(
        { success: false, error: 'Tag with this name already exists' },
        { status: 409 }
      )
    }
    
    // Create new tag
    const tag = new TagModel({
      name: name.trim(),
      description: description?.trim(),
      color: color || '#3B82F6',
      category: category || 'general',
      createdBy: user.id
    })
    
    await tag.save()
    
    return NextResponse.json({
      success: true,
      data: tag
    })
    
  } catch (error) {
    console.error('Create tag error:', error)
    return NextResponse.json(
      { success: false, error: 'Failed to create tag' },
      { status: 500 }
    )
  }
}
