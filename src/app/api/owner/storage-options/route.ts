import { NextRequest, NextResponse } from 'next/server'
import { connectToDatabase } from '@/lib/mongodb'
import { getCurrentUser } from '@/lib/access-control-server'
import { ObjectId } from 'mongodb'

export async function GET(request: NextRequest) {
  try {
    const { db } = await connectToDatabase()
    
    // Get current user
    const user = await getCurrentUser()
    if (!user) {
      return NextResponse.json(
        { success: false, error: 'Authentication required' },
        { status: 401 }
      )
    }

    // Get user's storage permissions
    const userCollection = db.collection('users')
    const userDoc = await userCollection.findOne({ _id: new ObjectId(user.id) })
    
    if (!userDoc) {
      return NextResponse.json(
        { success: false, error: 'User not found' },
        { status: 404 }
      )
    }

    // Get all available storage configurations
    const storageCollection = db.collection('storage_configs')
    const storageConfigs = await storageCollection.find({ isEnabled: true }).toArray()

    // Filter storage options based on user permissions
    let availableStorageOptions = []
    
    if (user.role === 'admin') {
      // Admins can use all enabled storage providers
      availableStorageOptions = storageConfigs.map(config => ({
        id: config.providerId,
        name: config.name,
        type: config.providerId,
        isEnabled: config.isEnabled
      }))
    } else if (user.role === 'owner') {
      // Owners can only use storage providers they're allowed to use
      const allowedProviders = userDoc.allowedStorageProviders || ['local'] // Default to local if not set
      
      availableStorageOptions = storageConfigs
        .filter(config => allowedProviders.includes(config.providerId))
        .map(config => ({
          id: config.providerId,
          name: config.name,
          type: config.providerId,
          isEnabled: config.isEnabled
        }))
    } else {
      // Guests can only use local storage
      availableStorageOptions = storageConfigs
        .filter(config => config.providerId === 'local')
        .map(config => ({
          id: config.providerId,
          name: config.name,
          type: config.providerId,
          isEnabled: config.isEnabled
        }))
    }

    // If no storage options are available, default to local
    if (availableStorageOptions.length === 0) {
      availableStorageOptions = [{
        id: 'local',
        name: 'Local Storage',
        type: 'local',
        isEnabled: true
      }]
    }

    return NextResponse.json({
      success: true,
      data: availableStorageOptions
    })
  } catch (error) {
    console.error('Failed to get storage options:', error)
    return NextResponse.json(
      { success: false, error: 'Failed to get storage options' },
      { status: 500 }
    )
  }
}
