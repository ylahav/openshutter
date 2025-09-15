import { NextRequest, NextResponse } from 'next/server'
import { connectToDatabase } from '@/lib/mongodb'

export async function GET(request: NextRequest) {
  try {
    const { db } = await connectToDatabase()
    
    // Get all storage configurations from database
    const collection = db.collection('storage_configs')
    const configs = await collection.find({}).toArray()
    
    // If no configs exist, return default options
    if (configs.length === 0) {
      return NextResponse.json({
        success: true,
        data: [
          {
            id: 'local',
            name: 'Local Storage',
            type: 'local',
            isEnabled: true
          }
        ]
      })
    }

    // Convert to the format expected by the frontend
    const storageOptions = configs.map(config => ({
      id: config.providerId,
      name: config.name,
      type: config.providerId,
      isEnabled: config.isEnabled
    }))

    return NextResponse.json({
      success: true,
      data: storageOptions
    })
  } catch (error) {
    console.error('Failed to get storage options:', error)
    return NextResponse.json(
      { success: false, error: 'Failed to get storage options' },
      { status: 500 }
    )
  }
}
