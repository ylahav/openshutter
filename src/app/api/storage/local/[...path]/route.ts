import { NextRequest, NextResponse } from 'next/server'
import fs from 'fs/promises'
import path from 'path'
import { storageConfigService } from '@/services/storage/config'

export async function GET(
  request: NextRequest,
  { params }: { params: Promise<{ path: string[] }> }
) {
  try {
    const { path: pathSegments } = await params
    const filePath = pathSegments.join('/')
    const decodedPath = decodeURIComponent(filePath)
    
    // Get local storage configuration
    const localConfig = await storageConfigService.getConfig('local')
    if (!localConfig) {
      return NextResponse.json(
        { error: 'Local storage not configured' },
        { status: 500 }
      )
    }
    
    const localStoragePath = localConfig.config.basePath
    let fullPath: string
    
    if (path.isAbsolute(localStoragePath)) {
      fullPath = path.join(localStoragePath, decodedPath)
    } else {
      fullPath = path.join(process.cwd(), localStoragePath, decodedPath)
    }
    
    // Security check: ensure the path is within the storage directory
    const normalizedFullPath = path.normalize(fullPath)
    let normalizedBasePath: string
    
    if (path.isAbsolute(localStoragePath)) {
      normalizedBasePath = path.normalize(localStoragePath)
    } else {
      normalizedBasePath = path.normalize(path.join(process.cwd(), localStoragePath))
    }
    
    if (!normalizedFullPath.startsWith(normalizedBasePath)) {
      return NextResponse.json(
        { error: 'Access denied' },
        { status: 403 }
      )
    }
    
    // Check if file exists
    try {
      await fs.access(normalizedFullPath)
    } catch {
      return NextResponse.json(
        { error: 'File not found' },
        { status: 404 }
      )
    }
    
    // Get file stats
    const stats = await fs.stat(normalizedFullPath)
    
    if (stats.isDirectory()) {
      return NextResponse.json(
        { error: 'Cannot serve directories' },
        { status: 400 }
      )
    }
    
    // Read file
    const fileBuffer = await fs.readFile(normalizedFullPath)
    
    // Determine content type
    const ext = path.extname(decodedPath).toLowerCase()
    const contentType = getContentType(ext)
    
    // Return file with appropriate headers
    return new NextResponse(new Uint8Array(fileBuffer), {
      headers: {
        'Content-Type': contentType,
        'Content-Length': stats.size.toString(),
        'Cache-Control': 'public, max-age=31536000', // Cache for 1 year
        'Last-Modified': stats.mtime.toUTCString()
      }
    })
    
  } catch (error) {
    console.error('Error serving local file:', error)
    return NextResponse.json(
      { error: 'Internal server error' },
      { status: 500 }
    )
  }
}

function getContentType(extension: string): string {
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
  
  return contentTypes[extension] || 'application/octet-stream'
}
