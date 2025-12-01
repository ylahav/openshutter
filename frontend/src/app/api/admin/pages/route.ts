import { NextRequest, NextResponse } from 'next/server'
import { connectToDatabase } from '@/lib/mongodb'
import { Page, PageCreate } from '@/lib/models/Page'
import { getServerSession } from 'next-auth'
import { authOptions } from '@/lib/auth'

// GET /api/admin/pages - Get all pages
export async function GET(request: NextRequest) {
  try {
    const session = await getServerSession(authOptions)
    if (!session?.user || (session.user as any).role !== 'admin') {
      return NextResponse.json({ success: false, error: 'Unauthorized' }, { status: 401 })
    }

    const { db } = await connectToDatabase()
    const { searchParams } = new URL(request.url)
    const category = searchParams.get('category')
    const published = searchParams.get('published')

    let query: any = {}
    if (category) query.category = category
    if (published !== null) query.isPublished = published === 'true'

    const pages = await db.collection('pages')
      .find(query)
      .sort({ createdAt: -1 })
      .toArray()

    return NextResponse.json({
      success: true,
      data: pages
    })
  } catch (error) {
    console.error('Failed to get pages:', error)
    return NextResponse.json(
      { success: false, error: 'Failed to get pages' },
      { status: 500 }
    )
  }
}

// POST /api/admin/pages - Create new page
export async function POST(request: NextRequest) {
  try {
    const session = await getServerSession(authOptions)
    if (!session?.user || (session.user as any).role !== 'admin') {
      return NextResponse.json({ success: false, error: 'Unauthorized' }, { status: 401 })
    }

    const body: PageCreate = await request.json()
    const { db } = await connectToDatabase()

    // Check if alias already exists
    const existingPage = await db.collection('pages').findOne({ alias: body.alias })
    if (existingPage) {
      return NextResponse.json(
        { success: false, error: 'Page with this alias already exists' },
        { status: 400 }
      )
    }

    const now = new Date()
    const pageData = {
      ...body,
      isPublished: body.isPublished ?? false,
      createdAt: now,
      updatedAt: now,
      createdBy: (session.user as any)._id,
      updatedBy: (session.user as any)._id
    }

    const result = await db.collection('pages').insertOne(pageData)

    return NextResponse.json({
      success: true,
      data: { _id: result.insertedId, ...pageData }
    })
  } catch (error) {
    console.error('Failed to create page:', error)
    return NextResponse.json(
      { success: false, error: 'Failed to create page' },
      { status: 500 }
    )
  }
}
