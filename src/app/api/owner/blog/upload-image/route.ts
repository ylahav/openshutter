import { NextRequest, NextResponse } from 'next/server'
import { getServerSession } from 'next-auth'
import { authOptions } from '@/lib/auth'
import { connectToDatabase } from '@/lib/mongodb'
import { StorageManager } from '@/services/storage/manager'
import { v4 as uuidv4 } from 'uuid'

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
    const formData = await request.formData()
    const file = formData.get('file') as File
    const alt = formData.get('alt') as string || ''
    const storageProvider = formData.get('storageProvider') as string || 'local'

    if (!file) {
      return NextResponse.json({ success: false, error: 'No file provided' }, { status: 400 })
    }

    // Validate file type
    if (!file.type.startsWith('image/')) {
      return NextResponse.json({ success: false, error: 'File must be an image' }, { status: 400 })
    }

    // Validate file size (10MB limit)
    const maxSize = 10 * 1024 * 1024 // 10MB
    if (file.size > maxSize) {
      return NextResponse.json({ success: false, error: 'File size must be less than 10MB' }, { status: 400 })
    }

    // Generate unique filename
    const fileExtension = file.name.split('.').pop() || 'jpg'
    const filename = `blog-${uuidv4()}.${fileExtension}`
    const storagePath = `blog-images/${userId}/${filename}`

    // Initialize storage manager
    const storageManager = StorageManager.getInstance()
    
    // Convert File to Buffer
    const arrayBuffer = await file.arrayBuffer()
    const buffer = Buffer.from(arrayBuffer)

    // Upload file
    const uploadResult = await storageManager.uploadBuffer(
      buffer,
      storagePath,
      storageProvider as any,
      file.type
    )

    // Get file URL
    const fileUrl = await storageManager.getPhotoUrl(storagePath, storageProvider as any)

    return NextResponse.json({
      success: true,
      data: {
        url: fileUrl,
        alt: alt,
        storageProvider: storageProvider,
        storagePath: storagePath,
        filename: filename,
        size: file.size,
        mimeType: file.type
      },
      message: 'Image uploaded successfully'
    })
  } catch (error) {
    console.error('Error uploading blog image:', error)
    return NextResponse.json(
      { success: false, error: 'Failed to upload image' },
      { status: 500 }
    )
  }
}
