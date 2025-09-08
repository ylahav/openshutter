import { NextRequest, NextResponse } from 'next/server'
import { getServerSession } from 'next-auth'
import { authOptions } from '@/lib/auth'
import { connectToDatabase } from '@/lib/mongodb'
import { ObjectId } from 'mongodb'

export async function POST(request: NextRequest) {
  try {
    // Check authentication
    const session = await getServerSession(authOptions)
    if (!session?.user || session.user.role !== 'admin') {
      return NextResponse.json({ success: false, error: 'Unauthorized' }, { status: 401 })
    }

    const { backup } = await request.json()
    
    if (!backup || !backup.collections) {
      return NextResponse.json({ 
        success: false, 
        error: 'Invalid backup format' 
      }, { status: 400 })
    }

    const { db } = await connectToDatabase()
    
    // Clear existing collections (optional - you might want to add a confirmation step)
    const existingCollections = await db.listCollections().toArray()
    for (const collectionInfo of existingCollections) {
      await db.collection(collectionInfo.name).deleteMany({})
    }

    // Restore each collection
    const restoredCollections: string[] = []
    for (const [collectionName, documents] of Object.entries(backup.collections)) {
      if (Array.isArray(documents)) {
        // Convert string IDs back to ObjectId
        const documentsWithObjectIds = documents.map((doc: any) => ({
          ...doc,
          _id: new ObjectId(doc._id)
        }))
        
        if (documentsWithObjectIds.length > 0) {
          await db.collection(collectionName).insertMany(documentsWithObjectIds)
          restoredCollections.push(collectionName)
        }
      }
    }

    return NextResponse.json({ 
      success: true, 
      message: `Database restored successfully. Restored ${restoredCollections.length} collections: ${restoredCollections.join(', ')}`
    })

  } catch (error) {
    console.error('Database restore error:', error)
    return NextResponse.json({ 
      success: false, 
      error: 'Failed to restore database' 
    }, { status: 500 })
  }
}
