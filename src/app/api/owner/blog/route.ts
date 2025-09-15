import { NextRequest, NextResponse } from 'next/server'
import { getServerSession } from 'next-auth'
import { authOptions } from '@/lib/auth'
import { connectToDatabase } from '@/lib/mongodb'
import { BlogArticleModel } from '@/lib/models/BlogArticle'
import { MultiLangUtils } from '@/types/multi-lang'

export async function GET(request: NextRequest) {
  try {
    const session = await getServerSession(authOptions)
    
    if (!session?.user) {
      return NextResponse.json({ success: false, error: 'Unauthorized' }, { status: 401 })
    }

    const userRole = (session.user as any)?.role
    if (userRole !== 'owner') {
      return NextResponse.json({ success: false, error: 'Forbidden' }, { status: 403 })
    }

    const { db } = await connectToDatabase()
    const { searchParams } = new URL(request.url)
    
    const page = parseInt(searchParams.get('page') || '1')
    const limit = parseInt(searchParams.get('limit') || '10')
    const category = searchParams.get('category')
    const search = searchParams.get('search')
    const isPublished = searchParams.get('isPublished')
    
    const userId = (session.user as any)?._id
    
    // Build query
    const query: any = { authorId: userId }
    
    if (category) {
      query.category = category
    }
    
    if (isPublished !== null) {
      query.isPublished = isPublished === 'true'
    }
    
    if (search) {
      // Search in title and content
      query.$or = [
        { 'title.en': { $regex: search, $options: 'i' } },
        { 'title.he': { $regex: search, $options: 'i' } },
        { 'content.en': { $regex: search, $options: 'i' } },
        { 'content.he': { $regex: search, $options: 'i' } }
      ]
    }
    
    const skip = (page - 1) * limit
    
    const [articles, total] = await Promise.all([
      BlogArticleModel.find(query)
        .sort({ createdAt: -1 })
        .skip(skip)
        .limit(limit)
        .lean(),
      BlogArticleModel.countDocuments(query)
    ])
    
    return NextResponse.json({
      success: true,
      data: articles,
      pagination: {
        page,
        limit,
        total,
        totalPages: Math.ceil(total / limit)
      }
    })
  } catch (error) {
    console.error('Error fetching blog articles:', error)
    return NextResponse.json(
      { success: false, error: 'Failed to fetch blog articles' },
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
    if (userRole !== 'owner') {
      return NextResponse.json({ success: false, error: 'Forbidden' }, { status: 403 })
    }

    const userId = (session.user as any)?._id
    const body = await request.json()
    
    const {
      title,
      category,
      tags = [],
      content,
      excerpt,
      isPublished = false,
      isFeatured = false,
      leadingImage,
      seoTitle,
      seoDescription
    } = body
    
    // Generate slug from title
    const slug = title.en
      ?.toLowerCase()
      .replace(/[^a-z0-9\s-]/g, '')
      .replace(/\s+/g, '-')
      .replace(/-+/g, '-')
      .trim() || ''
    
    // Ensure unique slug
    let finalSlug = slug
    let counter = 1
    while (await BlogArticleModel.findOne({ slug: finalSlug })) {
      finalSlug = `${slug}-${counter}`
      counter++
    }
    
    const article = new BlogArticleModel({
      title,
      slug: finalSlug,
      category,
      tags,
      content,
      excerpt,
      isPublished,
      isFeatured,
      leadingImage,
      seoTitle,
      seoDescription,
      authorId: userId,
      publishedAt: isPublished ? new Date() : undefined
    })
    
    await article.save()
    
    return NextResponse.json({
      success: true,
      data: article,
      message: 'Blog article created successfully'
    })
  } catch (error) {
    console.error('Error creating blog article:', error)
    return NextResponse.json(
      { success: false, error: 'Failed to create blog article' },
      { status: 500 }
    )
  }
}
