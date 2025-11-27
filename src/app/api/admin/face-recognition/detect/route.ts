import { NextRequest, NextResponse } from 'next/server'
import { getCurrentUser } from '@/lib/access-control-server'
import { connectToDatabase } from '@/lib/mongodb'
import { ObjectId } from 'mongodb'
// Note: Server-side face detection is disabled due to face-api.js environment issues
// Face detection is now done client-side and results are sent to this endpoint
import { storageManager } from '@/services/storage/manager'

/**
 * POST /api/admin/face-recognition/detect
 * Detect faces in a photo
 */
export async function POST(request: NextRequest) {
  try {
    const user = await getCurrentUser()
    if (user?.role !== 'admin' && user?.role !== 'owner') {
      return NextResponse.json({ success: false, error: 'Forbidden' }, { status: 403 })
    }

    const body = await request.json()
    const { photoId, faces, onlyMatched } = body

    if (!photoId) {
      return NextResponse.json({ success: false, error: 'Photo ID is required' }, { status: 400 })
    }

    const { db } = await connectToDatabase()
    const photo = await db.collection('photos').findOne({ _id: new ObjectId(photoId) })

    if (!photo) {
      return NextResponse.json({ success: false, error: 'Photo not found' }, { status: 404 })
    }

    // Face detection is now done CLIENT-SIDE to avoid server-side monkeyPatch issues
    // The client sends the detection results (including descriptors) to this endpoint
    if (!faces || !Array.isArray(faces)) {
      return NextResponse.json({ success: false, error: 'Face detection results are required' }, { status: 400 })
    }

    // Store face detection results from client
    // faces array contains: descriptor, box, landmarks
    // If onlyMatched is true, only store faces that have matchedPersonId
    // Preserve existing matchedPersonId if faces are re-detected
    const existingFaces = photo.faceRecognition?.faces || []
    let updatedFaces = faces.map((face: any, index: number) => {
      // Try to preserve existing match if face count matches and we can match by position
      const existingFace = existingFaces[index]
      return {
        descriptor: face.descriptor, // 128D vector from client-side detection
        box: face.box,
        landmarks: face.landmarks,
        detectedAt: new Date(),
        // Use provided match or preserve existing match if available
        matchedPersonId: face.matchedPersonId || existingFace?.matchedPersonId,
        confidence: face.confidence || existingFace?.confidence
      }
    })

    // If onlyMatched flag is set, filter to only matched faces
    if (onlyMatched) {
      updatedFaces = updatedFaces.filter((face: any) => face.matchedPersonId)
    }

    // Collect all matched person IDs from updated faces
    const matchedPersonIds = updatedFaces
      .filter((face: any) => face.matchedPersonId)
      .map((face: any) => {
        const personId = face.matchedPersonId
        return personId instanceof ObjectId ? personId : new ObjectId(personId)
      })

    // Update photo's people array with matched people
    const currentPeople = (photo.people || []).map((p: any) => 
      p instanceof ObjectId ? p.toString() : String(p)
    )
    const matchedPersonIdStrings = matchedPersonIds.map(id => id.toString())
    const updatedPeople = [...new Set([...currentPeople, ...matchedPersonIdStrings])].map(
      id => new ObjectId(id)
    )

    await db.collection('photos').updateOne(
      { _id: new ObjectId(photoId) },
      {
        $set: {
          'faceRecognition.faces': updatedFaces,
          'faceRecognition.processedAt': new Date(),
          'faceRecognition.modelVersion': '1.0',
          people: updatedPeople // Ensure matched people are in the people array
        }
      }
    )

    return NextResponse.json({
      success: true,
      data: {
        photoId,
        facesDetected: faces.length,
        faces: faces.map((face: any) => ({
          box: face.box,
          landmarks: face.landmarks
          // Don't send descriptor back to client (too large)
        }))
      }
    })
  } catch (error) {
    console.error('Face detection error:', error)
    return NextResponse.json(
      { success: false, error: error instanceof Error ? error.message : 'Face detection failed' },
      { status: 500 }
    )
  }
}
