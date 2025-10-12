import { NextRequest, NextResponse } from 'next/server'
import { connectToDatabase } from '@/lib/mongodb'
import { getCurrentUser } from '@/lib/access-control-server'
import { TagModel } from '@/lib/models/Tag'

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
    if (!user) {
      return NextResponse.json({ success: false, error: 'Unauthorized' }, { status: 401 })
    }
    
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
    const [tags, total] = await Promise.all([
      TagModel.find(query)
        .sort(sort)
        .skip(skip)
        .limit(limit)
        .lean(),
      TagModel.countDocuments(query)
    ])
    
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
