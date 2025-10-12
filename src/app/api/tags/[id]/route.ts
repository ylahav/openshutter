import { NextRequest, NextResponse } from 'next/server'
import { connectToDatabase } from '@/lib/mongodb'
import { getCurrentUser } from '@/lib/access-control-server'
import { TagModel } from '@/lib/models/Tag'
import { ObjectId } from 'mongodb'

export async function GET(
  request: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  try {
    const { id } = await params
    const { db } = await connectToDatabase()
    
    // Get current user for access control
    const user = await getCurrentUser()
    if (!user) {
      return NextResponse.json({ success: false, error: 'Unauthorized' }, { status: 401 })
    }
    
    // Validate ObjectId
    if (!ObjectId.isValid(id)) {
      return NextResponse.json(
        { success: false, error: 'Invalid tag ID' },
        { status: 400 }
      )
    }
    
    const tag = await TagModel.findById(id).lean()
    
    if (!tag) {
      return NextResponse.json(
        { success: false, error: 'Tag not found' },
        { status: 404 }
      )
    }
    
    return NextResponse.json({
      success: true,
      data: tag
    })
    
  } catch (error) {
    console.error('Get tag error:', error)
    return NextResponse.json(
      { success: false, error: 'Failed to fetch tag' },
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
    const { db } = await connectToDatabase()
    
    // Get current user for access control
    const user = await getCurrentUser()
    if (!user) {
      return NextResponse.json({ success: false, error: 'Unauthorized' }, { status: 401 })
    }
    
    // Validate ObjectId
    if (!ObjectId.isValid(id)) {
      return NextResponse.json(
        { success: false, error: 'Invalid tag ID' },
        { status: 400 }
      )
    }
    
    const body = await request.json()
    const { name, description, color, category, isActive } = body
    
    // Validate required fields
    if (!name) {
      return NextResponse.json(
        { success: false, error: 'Tag name is required' },
        { status: 400 }
      )
    }
    
    // Check if tag exists
    const existingTag = await TagModel.findById(id)
    if (!existingTag) {
      return NextResponse.json(
        { success: false, error: 'Tag not found' },
        { status: 404 }
      )
    }
    
    // Check if another tag with same name exists (excluding current tag)
    const duplicateTag = await TagModel.findOne({
      name: name.trim(),
      _id: { $ne: id }
    })
    
    if (duplicateTag) {
      return NextResponse.json(
        { success: false, error: 'Tag with this name already exists' },
        { status: 409 }
      )
    }
    
    // Update tag
    const updatedTag = await TagModel.findByIdAndUpdate(
      id,
      {
        name: name.trim(),
        description: description?.trim(),
        color: color || '#3B82F6',
        category: category || 'general',
        isActive: isActive !== undefined ? isActive : true
      },
      { new: true, runValidators: true }
    )
    
    return NextResponse.json({
      success: true,
      data: updatedTag
    })
    
  } catch (error) {
    console.error('Update tag error:', error)
    return NextResponse.json(
      { success: false, error: 'Failed to update tag' },
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
    const { db } = await connectToDatabase()
    
    // Get current user for access control
    const user = await getCurrentUser()
    if (!user) {
      return NextResponse.json({ success: false, error: 'Unauthorized' }, { status: 401 })
    }
    
    // Validate ObjectId
    if (!ObjectId.isValid(id)) {
      return NextResponse.json(
        { success: false, error: 'Invalid tag ID' },
        { status: 400 }
      )
    }
    
    // Check if tag exists
    const tag = await TagModel.findById(id)
    if (!tag) {
      return NextResponse.json(
        { success: false, error: 'Tag not found' },
        { status: 404 }
      )
    }
    
    // Check if tag is referenced in any photos
    const photoCount = await db.collection('photos').countDocuments({
      tags: new ObjectId(id)
    })
    
    if (photoCount > 0) {
      return NextResponse.json(
        { 
          success: false, 
          error: `Cannot delete tag. It is referenced in ${photoCount} photo(s). Please remove it from photos first.` 
        },
        { status: 409 }
      )
    }
    
    // Delete tag
    await TagModel.findByIdAndDelete(id)
    
    return NextResponse.json({
      success: true,
      message: 'Tag deleted successfully'
    })
    
  } catch (error) {
    console.error('Delete tag error:', error)
    return NextResponse.json(
      { success: false, error: 'Failed to delete tag' },
      { status: 500 }
    )
  }
}
