import { NextRequest, NextResponse } from 'next/server'
import { getCurrentUser } from '@/lib/access-control-server'
import { connectToDatabase } from '@/lib/mongodb'
import { ObjectId } from 'mongodb'
import { FaceRecognitionServerService } from '@/services/face-recognition-server'
import { storageManager } from '@/services/storage/manager'

/**
 * POST /api/admin/face-recognition/person-descriptor
 * Extract and store face descriptor for a person from their profile image
 */
export async function POST(request: NextRequest) {
  try {
    const user = await getCurrentUser()
    if (user?.role !== 'admin' && user?.role !== 'owner') {
      return NextResponse.json({ success: false, error: 'Forbidden' }, { status: 403 })
    }

    const body = await request.json()
    const { personId, imageUrl } = body

    if (!personId) {
      return NextResponse.json({ success: false, error: 'Person ID is required' }, { status: 400 })
    }

    if (!imageUrl) {
      return NextResponse.json({ success: false, error: 'Image URL is required' }, { status: 400 })
    }

    const { db } = await connectToDatabase()

    // Get person
    const person = await db.collection('people').findOne({ _id: new ObjectId(personId) })

    if (!person) {
      return NextResponse.json({ success: false, error: 'Person not found' }, { status: 404 })
    }

    // Download image
    let imageBuffer: Buffer
    try {
      if (imageUrl.startsWith('http://') || imageUrl.startsWith('https://')) {
        // External URL - fetch it
        const response = await fetch(imageUrl)
        if (!response.ok) {
          throw new Error('Failed to fetch image')
        }
        const arrayBuffer = await response.arrayBuffer()
        imageBuffer = Buffer.from(arrayBuffer)
      } else {
        // Local storage path
        const storageService = await storageManager.getProvider('local')
        const buffer = await storageService.getFileBuffer(imageUrl)
        if (!buffer) {
          throw new Error('Failed to load image from storage')
        }
        imageBuffer = buffer
      }
    } catch (error) {
      return NextResponse.json({ success: false, error: 'Failed to load image' }, { status: 400 })
    }

    // Detect face (should be single face for profile image)
    const faces = await FaceRecognitionServerService.detectFacesFromBuffer(imageBuffer)

    if (faces.length === 0) {
      return NextResponse.json({ success: false, error: 'No face detected in image' }, { status: 400 })
    }

    if (faces.length > 1) {
      return NextResponse.json({ success: false, error: 'Multiple faces detected. Please use an image with a single face.' }, { status: 400 })
    }

    const faceDescriptor = faces[0].descriptor

    // Update person with face descriptor
    await db.collection('people').updateOne(
      { _id: new ObjectId(personId) },
      {
        $set: {
          'faceRecognition.descriptor': faceDescriptor,
          'faceRecognition.extractedAt': new Date(),
          'faceRecognition.modelVersion': '1.0'
        }
      }
    )

    return NextResponse.json({
      success: true,
      data: {
        personId,
        descriptorExtracted: true,
        faceBox: faces[0].box
      }
    })
  } catch (error) {
    console.error('Person descriptor extraction error:', error)
    return NextResponse.json(
      { success: false, error: error instanceof Error ? error.message : 'Descriptor extraction failed' },
      { status: 500 }
    )
  }
}
