import { NextRequest, NextResponse } from 'next/server'
import { storageManager } from '@/services/storage/manager'

export async function GET(
  request: NextRequest,
  { params }: { params: Promise<{ path: string[] }> }
) {
  try {
    const { path: pathSegments } = await params
    const filePath = pathSegments.join('/')
    const decodedPath = decodeURIComponent(filePath)
    
    // Extract provider and file path from the URL
    // Expected format: /api/storage/serve/{provider}/{filepath}
    const pathParts = decodedPath.split('/')
    if (pathParts.length < 2) {
      return NextResponse.json(
        { error: 'Invalid path format. Expected: /api/storage/serve/{provider}/{filepath}' },
        { status: 400 }
      )
    }
    
    const provider = pathParts[0] as 'local' | 'google-drive' | 'aws-s3'
    const filePathParts = pathParts.slice(1)
    const fullFilePath = filePathParts.join('/')
    
    // Get file info from storage manager
    const fileInfo = await storageManager.getPhotoInfo(fullFilePath, provider)
    if (!fileInfo) {
      return NextResponse.json(
        { error: 'File not found' },
        { status: 404 }
      )
    }
    
    console.log(`Storage API: Getting file buffer for provider: ${provider}, path: ${fullFilePath}`)
    
    // Read file buffer from storage
    const fileBuffer = await storageManager.getPhotoBuffer(provider, fullFilePath)
    if (!fileBuffer) {
      console.error(`Storage API: Failed to get file buffer for provider: ${provider}, path: ${fullFilePath}`)
      return NextResponse.json(
        { error: 'Failed to read file' },
        { status: 500 }
      )
    }
    
    console.log(`Storage API: Successfully got file buffer, size: ${fileBuffer.length} bytes`)
    
    // Determine content type
    const ext = fullFilePath.split('.').pop()?.toLowerCase()
    const contentType = getContentType(ext)
    
    // Return file with appropriate headers
    return new NextResponse(new Uint8Array(fileBuffer), {
      headers: {
        'Content-Type': contentType,
        'Content-Length': fileBuffer.length.toString(),
        'Cache-Control': 'public, max-age=31536000', // Cache for 1 year
        'Last-Modified': new Date().toUTCString()
      }
    })
    
  } catch (error) {
    console.error('Error serving file:', error)
    return NextResponse.json(
      { error: 'Internal server error' },
      { status: 500 }
    )
  }
}

function getContentType(extension?: string): string {
  const contentTypes: Record<string, string> = {
    '.jpg': 'image/jpeg',
    '.jpeg': 'image/jpeg',
    '.png': 'image/png',
    '.gif': 'image/gif',
    '.webp': 'image/webp',
    '.svg': 'image/svg+xml',
    '.ico': 'image/x-icon',
    '.bmp': 'image/bmp',
    '.tiff': 'image/tiff',
    '.tif': 'image/tiff'
  }
  
  return contentTypes[extension || ''] || 'application/octet-stream'
}
