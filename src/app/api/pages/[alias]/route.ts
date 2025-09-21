import { NextRequest, NextResponse } from 'next/server'
import { connectToDatabase } from '@/lib/mongodb'

// GET /api/pages/[alias] - Get page by alias (public)
export async function GET(
  request: NextRequest,
  { params }: { params: Promise<{ alias: string }> }
) {
  try {
    const { alias } = await params
    const { db } = await connectToDatabase()

    const page = await db.collection('pages').findOne({ 
      alias: alias,
      isPublished: true 
    })

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

