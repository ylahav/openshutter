import { NextRequest, NextResponse } from 'next/server'
import { PhotoUploadService } from '@/services/photo-upload'
import { getCurrentUser } from '@/lib/access-control-server'

// Configure route to accept larger body size (up to 100MB)
// Note: Next.js has a default body size limit (~4.5MB for JSON, ~20MB for form data)
// To increase this limit, you may need to:
// 1. For development: Set NODE_OPTIONS environment variable or use a custom server
// 2. For production: Configure at deployment level (nginx client_max_body_size, etc.)
export const runtime = 'nodejs'
export const maxDuration = 300 // 5 minutes for large file uploads

export async function POST(request: NextRequest) {
  try {
    // Get current user for authentication and user ID
    const user = await getCurrentUser()
    if (!user) {
      return NextResponse.json(
        { success: false, error: 'Unauthorized' },
        { status: 401 }
      )
    }

    // Parse form data
    const formData = await request.formData()
    const file = formData.get('file') as File
    const albumId = formData.get('albumId') as string
    const title = formData.get('title') as string
    const description = formData.get('description') as string
    const tags = formData.get('tags') as string

    if (!file) {
      return NextResponse.json(
        { success: false, error: 'No file provided' },
        { status: 400 }
      )
    }

    // Validate file type
    if (!file.type.startsWith('image/')) {
      return NextResponse.json(
        { success: false, error: 'File must be an image' },
        { status: 400 }
      )
    }

    // Validate file size (100MB limit)
    const maxSize = 100 * 1024 * 1024 // 100MB
    if (file.size > maxSize) {
      return NextResponse.json(
        { success: false, error: 'File size exceeds 100MB limit' },
        { status: 400 }
      )
    }

    // Convert file to buffer
    const arrayBuffer = await file.arrayBuffer()
    const buffer = Buffer.from(arrayBuffer)

    // Parse tags
    const parsedTags = tags ? tags.split(',').map(tag => tag.trim()).filter(tag => tag) : []

    // Upload photo using the service
    const result = await PhotoUploadService.uploadPhoto(
      buffer,
      file.name,
      file.type,
      {
        albumId: albumId || undefined,
        title: title || undefined,
        description: description || undefined,
        tags: parsedTags,
        uploadedBy: user.id
      }
    )

    if (!result.success) {
      return NextResponse.json(
        { success: false, error: result.error || 'Upload failed' },
        { status: 500 }
      )
    }

    return NextResponse.json({
      success: true,
      message: 'Photo uploaded successfully',
      photo: result.photo,
      thumbnailPath: result.thumbnailPath,
      exifData: result.exifData
    })

  } catch (error) {
    console.error('Photo upload failed:', error)
    return NextResponse.json(
      { 
        success: false, 
        error: error instanceof Error ? error.message : 'Upload failed' 
      },
      { status: 500 }
    )
  }
}

// Handle OPTIONS request for CORS
export async function OPTIONS() {
  return new NextResponse(null, {
    status: 200,
    headers: {
      'Access-Control-Allow-Origin': '*',
      'Access-Control-Allow-Methods': 'POST, OPTIONS',
      'Access-Control-Allow-Headers': 'Content-Type',
    },
  })
}
