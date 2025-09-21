import { NextRequest, NextResponse } from 'next/server'
import { connectToDatabase } from '@/lib/mongodb'
import { PageUpdate } from '@/lib/models/Page'
import { getServerSession } from 'next-auth'
import { authOptions } from '@/lib/auth'
import { ObjectId } from 'mongodb'

// GET /api/admin/pages/[id] - Get single page
export async function GET(
  request: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  try {
    const session = await getServerSession(authOptions)
    if (!session?.user || (session.user as any).role !== 'admin') {
      return NextResponse.json({ success: false, error: 'Unauthorized' }, { status: 401 })
    }

    const { id } = await params
    const { db } = await connectToDatabase()

    const page = await db.collection('pages').findOne({ _id: new ObjectId(id) })
    if (!page) {
      return NextResponse.json(
        { success: false, error: 'Page not found' },
        { status: 404 }
      )
    }

    return NextResponse.json({
      success: true,
      data: page
    })
  } catch (error) {
    console.error('Failed to get page:', error)
    return NextResponse.json(
      { success: false, error: 'Failed to get page' },
      { status: 500 }
    )
  }
}

// PUT /api/admin/pages/[id] - Update page
export async function PUT(
  request: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  try {
    const session = await getServerSession(authOptions)
    if (!session?.user || (session.user as any).role !== 'admin') {
      return NextResponse.json({ success: false, error: 'Unauthorized' }, { status: 401 })
    }

    const { id } = await params
    const body: PageUpdate = await request.json()
    const { db } = await connectToDatabase()

    // Check if alias already exists (excluding current page)
    if (body.alias) {
      const existingPage = await db.collection('pages').findOne({ 
        alias: body.alias, 
        _id: { $ne: new ObjectId(id) } 
      })
      if (existingPage) {
        return NextResponse.json(
          { success: false, error: 'Page with this alias already exists' },
          { status: 400 }
        )
      }
    }

    const updateData = {
      ...body,
      updatedAt: new Date(),
      updatedBy: (session.user as any)._id
    }

    const result = await db.collection('pages').updateOne(
      { _id: new ObjectId(id) },
      { $set: updateData }
    )

    if (result.matchedCount === 0) {
      return NextResponse.json(
        { success: false, error: 'Page not found' },
        { status: 404 }
      )
    }

    const updatedPage = await db.collection('pages').findOne({ _id: new ObjectId(id) })

    return NextResponse.json({
      success: true,
      data: updatedPage
    })
  } catch (error) {
    console.error('Failed to update page:', error)
    return NextResponse.json(
      { success: false, error: 'Failed to update page' },
      { status: 500 }
    )
  }
}

// DELETE /api/admin/pages/[id] - Delete page
export async function DELETE(
  request: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  try {
    const session = await getServerSession(authOptions)
    if (!session?.user || (session.user as any).role !== 'admin') {
      return NextResponse.json({ success: false, error: 'Unauthorized' }, { status: 401 })
    }

    const { id } = await params
    const { db } = await connectToDatabase()

    const result = await db.collection('pages').deleteOne({ _id: new ObjectId(id) })

    if (result.deletedCount === 0) {
      return NextResponse.json(
        { success: false, error: 'Page not found' },
        { status: 404 }
      )
    }

    return NextResponse.json({
      success: true,
      message: 'Page deleted successfully'
    })
  } catch (error) {
    console.error('Failed to delete page:', error)
    return NextResponse.json(
      { success: false, error: 'Failed to delete page' },
      { status: 500 }
    )
  }
}
