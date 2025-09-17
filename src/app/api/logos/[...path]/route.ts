import { NextRequest, NextResponse } from 'next/server'
import { readFile } from 'fs/promises'
import { join } from 'path'
import { existsSync } from 'fs'

export async function GET(
  request: NextRequest,
  { params }: { params: Promise<{ path: string[] }> }
) {
  try {
    const { path } = await params
    const filename = path.join('/')
    
    // Security check - only allow image files
    if (!/\.(jpg|jpeg|png|gif|webp|svg)$/i.test(filename)) {
      return new NextResponse('Forbidden', { status: 403 })
    }
    
    // Path to the logo file
    const logoPath = join(process.cwd(), 'public', 'logos', filename)
    
    // Check if file exists
    if (!existsSync(logoPath)) {
      return new NextResponse('Logo not found', { status: 404 })
    }
    
    // Read the file
    const fileBuffer = await readFile(logoPath)
    
    // Determine content type based on file extension
    const ext = filename.split('.').pop()?.toLowerCase()
    const contentType = {
      'jpg': 'image/jpeg',
      'jpeg': 'image/jpeg',
      'png': 'image/png',
      'gif': 'image/gif',
      'webp': 'image/webp',
      'svg': 'image/svg+xml'
    }[ext || ''] || 'application/octet-stream'
    
    // Return the file with appropriate headers
    return new NextResponse(new Uint8Array(fileBuffer), {
      status: 200,
      headers: {
        'Content-Type': contentType,
        'Cache-Control': 'public, max-age=31536000, immutable', // 1 year cache
        'Content-Length': fileBuffer.length.toString(),
      },
    })
    
  } catch (error) {
    console.error('Error serving logo:', error)
    return new NextResponse('Internal Server Error', { status: 500 })
  }
}
