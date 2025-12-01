import { NextRequest, NextResponse } from 'next/server'
import { getServerSession } from 'next-auth'
import { authOptions } from '@/lib/auth'
import { connectToDatabase } from '@/lib/mongodb'
import { BlogArticleModel } from '@/lib/models/BlogArticle'
import { ObjectId } from 'mongodb'

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
    if (userRole !== 'owner') {
      return NextResponse.json({ success: false, error: 'Forbidden' }, { status: 403 })
    }

    const userId = (session.user as any)?._id
    const { id: articleId } = await params
    
    if (!ObjectId.isValid(articleId)) {
      return NextResponse.json({ success: false, error: 'Invalid article ID' }, { status: 400 })
    }
    
    const article = await BlogArticleModel.findOne({
      _id: new ObjectId(articleId),
      authorId: userId
    }).lean()
    
    if (!article) {
      return NextResponse.json({ success: false, error: 'Article not found' }, { status: 404 })
    }
    
    return NextResponse.json({
      success: true,
      data: article
    })
  } catch (error) {
    console.error('Error fetching blog article:', error)
    return NextResponse.json(
      { success: false, error: 'Failed to fetch blog article' },
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
    if (userRole !== 'owner') {
      return NextResponse.json({ success: false, error: 'Forbidden' }, { status: 403 })
    }

    const userId = (session.user as any)?._id
    const { id: articleId } = await params
    const body = await request.json()
    
    if (!ObjectId.isValid(articleId)) {
      return NextResponse.json({ success: false, error: 'Invalid article ID' }, { status: 400 })
    }
    
    const {
      title,
      category,
      tags = [],
      content,
      excerpt,
      isPublished,
      isFeatured,
      leadingImage,
      seoTitle,
      seoDescription
    } = body
    
    // Check if article exists and belongs to user
    const existingArticle = await BlogArticleModel.findOne({
      _id: new ObjectId(articleId),
      authorId: userId
    })
    
    if (!existingArticle) {
      return NextResponse.json({ success: false, error: 'Article not found' }, { status: 404 })
    }
    
    // Generate new slug if title changed
    let slug = existingArticle.slug
    if (title && title.en !== existingArticle.title.en) {
      const newSlug = title.en
        ?.toLowerCase()
        .replace(/[^a-z0-9\s-]/g, '')
        .replace(/\s+/g, '-')
        .replace(/-+/g, '-')
        .trim() || ''
      
      // Ensure unique slug
      let finalSlug = newSlug
      let counter = 1
      while (await BlogArticleModel.findOne({ slug: finalSlug, _id: { $ne: new ObjectId(articleId) } })) {
        finalSlug = `${newSlug}-${counter}`
        counter++
      }
      slug = finalSlug
    }
    
    const updateData: any = {
      title,
      slug,
      category,
      tags,
      content,
      excerpt,
      isPublished,
      isFeatured,
      leadingImage,
      seoTitle,
      seoDescription
    }
    
    // Set publishedAt if publishing for the first time
    if (isPublished && !existingArticle.isPublished) {
      updateData.publishedAt = new Date()
    }
    
    const article = await BlogArticleModel.findByIdAndUpdate(
      new ObjectId(articleId),
      updateData,
      { new: true, runValidators: true }
    )
    
    return NextResponse.json({
      success: true,
      data: article,
      message: 'Blog article updated successfully'
    })
  } catch (error) {
    console.error('Error updating blog article:', error)
    return NextResponse.json(
      { success: false, error: 'Failed to update blog article' },
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
    if (userRole !== 'owner') {
      return NextResponse.json({ success: false, error: 'Forbidden' }, { status: 403 })
    }

    const userId = (session.user as any)?._id
    const { id: articleId } = await params
    
    if (!ObjectId.isValid(articleId)) {
      return NextResponse.json({ success: false, error: 'Invalid article ID' }, { status: 400 })
    }
    
    const article = await BlogArticleModel.findOneAndDelete({
      _id: new ObjectId(articleId),
      authorId: userId
    })
    
    if (!article) {
      return NextResponse.json({ success: false, error: 'Article not found' }, { status: 404 })
    }
    
    return NextResponse.json({
      success: true,
      message: 'Blog article deleted successfully'
    })
  } catch (error) {
    console.error('Error deleting blog article:', error)
    return NextResponse.json(
      { success: false, error: 'Failed to delete blog article' },
      { status: 500 }
    )
  }
}
