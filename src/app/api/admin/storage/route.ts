import { NextRequest, NextResponse } from 'next/server'
import { connectToDatabase } from '@/lib/mongodb'

// Default configurations
const DEFAULT_STORAGE_CONFIGS = [
  {
    providerId: 'google-drive',
    name: 'Google Drive',
    isEnabled: false,
    config: {
      clientId: '',
      clientSecret: '',
      refreshToken: '',
      folderId: '',
      isEnabled: false
    }
  },
  {
    providerId: 'aws-s3',
    name: 'Amazon S3',
    isEnabled: false,
    config: {
      accessKeyId: '',
      secretAccessKey: '',
      region: 'us-east-1',
      bucketName: '',
      isEnabled: false
    }
  },
  {
    providerId: 'local',
    name: 'Local Storage',
    isEnabled: false,
    config: {
      basePath: '/app/public/albums',
      maxFileSize: '100MB',
      isEnabled: false
    }
  }
]

export async function GET(request: NextRequest) {
  try {
    // Connect to database
    const { db } = await connectToDatabase()
    
    const { searchParams } = new URL(request.url)
    const provider = searchParams.get('provider')

    // Get all storage configurations from database
    const collection = db.collection('storage_configs')
    let configs = await collection.find({}).toArray()
    
    // If no configs exist, create default ones
    if (configs.length === 0) {
      console.log('No storage configs found, creating defaults...')
      const result = await collection.insertMany(DEFAULT_STORAGE_CONFIGS)
      console.log('Default configs created:', result.insertedIds)
      configs = await collection.find({}).toArray()
    }

    // Convert to the format expected by the frontend
    const formattedConfigs = {
      'google-drive': {
        clientId: configs.find(c => c.providerId === 'google-drive')?.config?.clientId || '',
        clientSecret: configs.find(c => c.providerId === 'google-drive')?.config?.clientSecret || '',
        refreshToken: configs.find(c => c.providerId === 'google-drive')?.config?.refreshToken || '',
        folderId: configs.find(c => c.providerId === 'google-drive')?.config?.folderId || '',
        isEnabled: configs.find(c => c.providerId === 'google-drive')?.isEnabled || false
      },
      'aws-s3': {
        accessKeyId: configs.find(c => c.providerId === 'aws-s3')?.config?.accessKeyId || '',
        secretAccessKey: configs.find(c => c.providerId === 'aws-s3')?.config?.secretAccessKey || '',
        region: configs.find(c => c.providerId === 'aws-s3')?.config?.region || 'us-east-1',
        bucketName: configs.find(c => c.providerId === 'aws-s3')?.config?.bucketName || '',
        isEnabled: configs.find(c => c.providerId === 'aws-s3')?.isEnabled || false
      },
      'local': {
        basePath: configs.find(c => c.providerId === 'local')?.config?.basePath || '/app/public/albums',
        maxFileSize: configs.find(c => c.providerId === 'local')?.config?.maxFileSize || '100MB',
        isEnabled: configs.find(c => c.providerId === 'local')?.isEnabled || false
      }
    }

    if (provider && formattedConfigs[provider as keyof typeof formattedConfigs]) {
      return NextResponse.json({ 
        success: true, 
        data: formattedConfigs[provider as keyof typeof formattedConfigs] 
      })
    }

    return NextResponse.json({ 
      success: true, 
      data: formattedConfigs 
    })
  } catch (error) {
    console.error('Failed to get storage configuration:', error)
    return NextResponse.json(
      { success: false, error: 'Failed to get storage configuration' },
      { status: 500 }
    )
  }
}

export async function POST(request: NextRequest) {
  try {
    // Connect to database
    const { db } = await connectToDatabase()
    
    const body = await request.json()
    const { provider, config } = body

    if (!provider || !config) {
      return NextResponse.json(
        { success: false, error: 'Provider and configuration are required' },
        { status: 400 }
      )
    }

    // Update or create storage configuration
    const updateData = {
      providerId: provider,
      name: provider === 'google-drive' ? 'Google Drive' : 
            provider === 'aws-s3' ? 'Amazon S3' : 'Local Storage',
      isEnabled: config.isEnabled || false,
      config: config,
      updatedAt: new Date()
    }

    const collection = db.collection('storage_configs')
    const result = await collection.updateOne(
      { providerId: provider },
      { 
        $set: updateData,
        $setOnInsert: { createdAt: new Date() }
      },
      { upsert: true }
    )

    console.log(`Storage configuration saved for ${provider}:`, result)

    return NextResponse.json({ 
      success: true, 
      message: `${provider} configuration saved successfully`,
      data: result
    })
  } catch (error) {
    console.error('Failed to save storage configuration:', error)
    return NextResponse.json(
      { success: false, error: 'Failed to save storage configuration' },
      { status: 500 }
    )
  }
}

export async function PUT(request: NextRequest) {
  try {
    // Connect to database
    const { db } = await connectToDatabase()
    
    const body = await request.json()
    const { provider, enabled } = body

    if (!provider || typeof enabled !== 'boolean') {
      return NextResponse.json(
        { success: false, error: 'Provider and enabled status are required' },
        { status: 400 }
      )
    }

    // Update provider status
    const collection = db.collection('storage_configs')
    const result = await collection.updateOne(
      { providerId: provider },
      { 
        $set: { 
          isEnabled: enabled,
          updatedAt: new Date()
        }
      }
    )

    if (result.matchedCount === 0) {
      return NextResponse.json(
        { success: false, error: 'Storage provider not found' },
        { status: 404 }
      )
    }

    console.log(`Storage provider ${provider} status updated to:`, enabled)

    return NextResponse.json({ 
      success: true, 
      message: `${provider} ${enabled ? 'enabled' : 'disabled'} successfully`,
      data: result
    })
  } catch (error) {
    console.error('Failed to update storage provider status:', error)
    return NextResponse.json(
      { success: false, error: 'Failed to update storage provider status' },
      { status: 500 }
    )
  }
}
