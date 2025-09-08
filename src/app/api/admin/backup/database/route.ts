import { NextRequest, NextResponse } from 'next/server'
import { getServerSession } from 'next-auth'
import { authOptions } from '@/lib/auth'
import { connectToDatabase } from '@/lib/mongodb'

export async function POST(request: NextRequest) {
  try {
    // Check authentication
    const session = await getServerSession(authOptions)
    if (!session?.user || session.user.role !== 'admin') {
      return NextResponse.json({ success: false, error: 'Unauthorized' }, { status: 401 })
    }

    const { db } = await connectToDatabase()
    
    // Get all collections
    const collections = await db.listCollections().toArray()
    const backup: any = {
      timestamp: new Date().toISOString(),
      version: '1.0',
      collections: {}
    }

    // Export each collection
    for (const collectionInfo of collections) {
      const collectionName = collectionInfo.name
      const collection = db.collection(collectionName)
      const documents = await collection.find({}).toArray()
      
      // Convert ObjectId to string for JSON serialization
      const serializedDocuments = documents.map(doc => ({
        ...doc,
        _id: doc._id.toString()
      }))
      
      backup.collections[collectionName] = serializedDocuments
    }

    return NextResponse.json({ 
      success: true, 
      backup,
      message: `Backup created with ${Object.keys(backup.collections).length} collections`
    })

  } catch (error) {
    console.error('Database backup error:', error)
    return NextResponse.json({ 
      success: false, 
      error: 'Failed to create database backup' 
    }, { status: 500 })
  }
}
