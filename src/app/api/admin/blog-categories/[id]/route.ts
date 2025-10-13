import { NextRequest, NextResponse } from 'next/server'
import { getServerSession } from 'next-auth'
import { authOptions } from '@/lib/auth'
import { connectToDatabase } from '@/lib/mongodb'
import { ObjectId } from 'mongodb'
import slugify from 'slugify'
import { BlogCategory } from '@/types'
import { MultiLangText } from '@/types/multi-lang'

export async function GET(
  request: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  try {
    const session = await getServerSession(authOptions)

    if (!session?.user) {
      return NextResponse.json({ success: false, error: 'Unauthorized' }, { status: 401 })
    }

    const userRole = (session.user as any)?.role

    if (userRole !== 'admin') {
      return NextResponse.json({ success: false, error: 'Forbidden' }, { status: 403 })
    }

    const { db } = await connectToDatabase()

    const { id: categoryId } = await params

    if (!ObjectId.isValid(categoryId)) {
      return NextResponse.json({ success: false, error: 'Invalid category ID' }, { status: 400 })
    }

    const collection = db.collection('blogcategories')
    const category = await collection.findOne({ _id: new ObjectId(categoryId) })

    if (!category) {
      return NextResponse.json({ success: false, error: 'Category not found' }, { status: 404 })
    }

    return NextResponse.json({
      success: true,
      data: category
    })
  } catch (error) {
    console.error('Error fetching blog category:', error)
    return NextResponse.json(
      { success: false, error: 'Failed to fetch blog category' },
      { status: 500 }
    )
  }
}

export async function PUT(
  request: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  try {
    const session = await getServerSession(authOptions)

    if (!session?.user) {
      return NextResponse.json({ success: false, error: 'Unauthorized' }, { status: 401 })
    }

    const userRole = (session.user as any)?.role

    if (userRole !== 'admin') {
      return NextResponse.json({ success: false, error: 'Forbidden' }, { status: 403 })
    }

    const { db } = await connectToDatabase()

    const { id: categoryId } = await params

    if (!ObjectId.isValid(categoryId)) {
      return NextResponse.json({ success: false, error: 'Invalid category ID' }, { status: 400 })
    }

    const body = await request.json()
    const { title, description, leadingImage, isActive, sortOrder } = body as Partial<BlogCategory>

    if (!title) {
      return NextResponse.json({ success: false, error: 'Title is required' }, { status: 400 })
    }

    const collection = db.collection('blogcategories')
    const existingCategory = await collection.findOne({ _id: new ObjectId(categoryId) })

    if (!existingCategory) {
      return NextResponse.json({ success: false, error: 'Category not found' }, { status: 404 })
    }

    // Update alias if title changes
    const titleText = (typeof title === 'string')
      ? title
      : ((title && typeof title === 'object') ? (title.en || title.he || 'untitled') : 'untitled')
    const newAlias = slugify(titleText, { lower: true, strict: true })
    let uniqueAlias = newAlias
    if (newAlias !== existingCategory.alias) {
      let counter = 1
      while (await collection.findOne({ alias: uniqueAlias, _id: { $ne: existingCategory._id } })) {
        uniqueAlias = `${newAlias}-${counter}`
        counter++
      }
    }

    const updateData = {
      alias: uniqueAlias,
      title,
      description,
      leadingImage,
      isActive: isActive !== undefined ? isActive : existingCategory.isActive,
      sortOrder: sortOrder !== undefined ? sortOrder : existingCategory.sortOrder,
      updatedAt: new Date()
    }

    const result = await collection.findOneAndUpdate(
      { _id: new ObjectId(categoryId) },
      { $set: updateData },
      { returnDocument: 'after' }
    )

    if (!result) {
      return NextResponse.json({ success: false, error: 'Failed to update category' }, { status: 500 })
    }

    const updatedCategory = result

    return NextResponse.json({
      success: true,
      data: updatedCategory,
      message: 'Blog category updated successfully'
    })
  } catch (error) {
    console.error('Error updating blog category:', error)
    return NextResponse.json(
      { success: false, error: 'Failed to update blog category' },
      { status: 500 }
    )
  }
}

export async function DELETE(
  request: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  try {
    const session = await getServerSession(authOptions)

    if (!session?.user) {
      return NextResponse.json({ success: false, error: 'Unauthorized' }, { status: 401 })
    }

    const userRole = (session.user as any)?.role

    if (userRole !== 'admin') {
      return NextResponse.json({ success: false, error: 'Forbidden' }, { status: 403 })
    }

    const { db } = await connectToDatabase()

    const { id: categoryId } = await params

    if (!ObjectId.isValid(categoryId)) {
      return NextResponse.json({ success: false, error: 'Invalid category ID' }, { status: 400 })
    }

    const collection = db.collection('blogcategories')
    const deleteResult = await collection.deleteOne({ _id: new ObjectId(categoryId) })

    if (deleteResult.deletedCount === 0) {
      return NextResponse.json({ success: false, error: 'Category not found' }, { status: 404 })
    }

    return NextResponse.json({
      success: true,
      message: 'Blog category deleted successfully'
    })
  } catch (error) {
    console.error('Error deleting blog category:', error)
    return NextResponse.json(
      { success: false, error: 'Failed to delete blog category' },
      { status: 500 }
    )
  }
}
