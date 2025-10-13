import { NextRequest, NextResponse } from 'next/server'
import { getServerSession } from 'next-auth'
import { authOptions } from '@/lib/auth'
import { connectToDatabase } from '@/lib/mongodb'
import { BlogCategory } from '@/types'
import { MultiLangText } from '@/types/multi-lang'
import slugify from 'slugify'
import { ObjectId } from 'mongodb'

export async function GET(request: NextRequest) {
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

    const { searchParams } = new URL(request.url)
    const q = searchParams.get('q') || ''
    const isActive = searchParams.get('isActive')
    const page = parseInt(searchParams.get('page') || '1')
    const limit = parseInt(searchParams.get('limit') || '10')

    const query: any = {}

    if (q) {
      query.$or = [
        { 'title.en': { $regex: q, $options: 'i' } },
        { 'title.he': { $regex: q, $options: 'i' } },
        { 'description.en': { $regex: q, $options: 'i' } },
        { 'description.he': { $regex: q, $options: 'i' } },
        { alias: { $regex: q, $options: 'i' } }
      ]
    }

    if (isActive !== null && isActive !== undefined) {
      query.isActive = isActive === 'true'
    }

    const collection = db.collection('blogcategories')
    const total = await collection.countDocuments(query)
    const categories = await collection
      .find(query)
      .sort({ sortOrder: 1, createdAt: -1 })
      .skip((page - 1) * limit)
      .limit(limit)
      .toArray()

    return NextResponse.json({
      success: true,
      data: categories,
      pagination: {
        page,
        limit,
        total,
        totalPages: Math.ceil(total / limit),
      },
    })
  } catch (error) {
    console.error('Error fetching blog categories:', error)
    return NextResponse.json(
      { success: false, error: 'Failed to fetch blog categories' },
      { status: 500 }
    )
  }
}

export async function POST(request: NextRequest) {
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

    const body = await request.json()
    const { title, description, leadingImage, isActive, sortOrder } = body as Partial<BlogCategory>

    if (!title) {
      return NextResponse.json({ success: false, error: 'Title is required' }, { status: 400 })
    }

    const titleText = (typeof title === 'string')
      ? title
      : ((title && typeof title === 'object') ? (title.en || title.he || 'untitled') : 'untitled')
    const generatedAlias = slugify(titleText, { lower: true, strict: true })

    // Ensure alias is unique
    const collection = db.collection('blogcategories')
    let uniqueAlias = generatedAlias
    let counter = 1
    while (await collection.findOne({ alias: uniqueAlias })) {
      uniqueAlias = `${generatedAlias}-${counter}`
      counter++
    }

    const newCategory = {
      alias: uniqueAlias,
      title,
      description,
      leadingImage,
      isActive: isActive !== undefined ? isActive : true,
      sortOrder: sortOrder || 0,
      createdAt: new Date(),
      updatedAt: new Date()
    }

    const result = await collection.insertOne(newCategory)
    const insertedCategory = { ...newCategory, _id: result.insertedId }

    return NextResponse.json({
      success: true,
      data: insertedCategory,
      message: 'Blog category created successfully'
    }, { status: 201 })
  } catch (error) {
    console.error('Error creating blog category:', error)
    return NextResponse.json(
      { success: false, error: 'Failed to create blog category' },
      { status: 500 }
    )
  }
}
