import { NextRequest, NextResponse } from 'next/server'
import { StorageManager } from '@/services/storage/manager'

export async function GET(request: NextRequest) {
  try {
    // Use the storage manager to get the Google Drive service
    const storageManager = StorageManager.getInstance()
    const googleDrive = await storageManager.getProvider('google-drive')

    // Test connection
    const isValid = await googleDrive.validateConnection()
    
    if (!isValid) {
      return NextResponse.json(
        { 
          success: false, 
          error: 'Failed to validate Google Drive connection' 
        },
        { status: 500 }
      )
    }

    return NextResponse.json({
      success: true,
      message: 'Google Drive connection successful',
      config: {
        provider: 'google-drive',
        status: 'active'
      }
    })

  } catch (error) {
    console.error('Google Drive test failed:', error)
    return NextResponse.json(
      { 
        success: false, 
        error: error instanceof Error ? error.message : 'Unknown error occurred' 
      },
      { status: 500 }
    )
  }
}
