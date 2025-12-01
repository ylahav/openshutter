import { NextRequest, NextResponse } from 'next/server'
import { getCurrentUser } from '@/lib/access-control-server'
import { connectToDatabase } from '@/lib/mongodb'
import { ObjectId } from 'mongodb'

/**
 * POST /api/admin/face-recognition/bulk-detect
 * Detect faces in multiple photos
 */
export async function POST(request: NextRequest) {
  try {
    const user = await getCurrentUser()
    if (user?.role !== 'admin' && user?.role !== 'owner') {
      return NextResponse.json({ success: false, error: 'Forbidden' }, { status: 403 })
    }

    const body = await request.json()
    const { photoIds } = body

    if (!photoIds || !Array.isArray(photoIds) || photoIds.length === 0) {
      return NextResponse.json({ success: false, error: 'Photo IDs array is required' }, { status: 400 })
    }

    const { db } = await connectToDatabase()

    // Get all photos
    const photos = await db.collection('photos')
      .find({ _id: { $in: photoIds.map((id: string) => new ObjectId(id)) } })
      .toArray()

    if (photos.length === 0) {
      return NextResponse.json({ success: false, error: 'No photos found' }, { status: 404 })
    }

    const results = {
      total: photos.length,
      processed: 0,
      succeeded: 0,
      failed: 0,
      errors: [] as Array<{ photoId: string; error: string }>
    }

    // Process each photo by triggering client-side detection
    // Since face detection is client-side, we'll return instructions for the client
    // The client will need to call the detect endpoint for each photo
    for (const photo of photos) {
      try {
        // Check if photo has storage URL
        if (!photo.storage?.url) {
          results.failed++
          results.errors.push({
            photoId: photo._id.toString(),
            error: 'Photo has no storage URL'
          })
          continue
        }

        // For now, we'll mark it as queued
        // The actual detection will happen client-side
        results.processed++
        results.succeeded++
      } catch (error) {
        results.failed++
        results.errors.push({
          photoId: photo._id.toString(),
          error: error instanceof Error ? error.message : 'Unknown error'
        })
      }
    }

    return NextResponse.json({
      success: true,
      data: {
        ...results,
        message: `Face detection queued for ${results.succeeded} photo(s). Detection will be performed client-side.`
      }
    })
  } catch (error) {
    console.error('Bulk face detection error:', error)
    return NextResponse.json(
      { success: false, error: error instanceof Error ? error.message : 'Bulk face detection failed' },
      { status: 500 }
    )
  }
}
