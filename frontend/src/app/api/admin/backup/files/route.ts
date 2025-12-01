import { NextRequest, NextResponse } from 'next/server'
import { getServerSession } from 'next-auth'
import { authOptions } from '@/lib/auth'
import { promises as fs } from 'fs'
import path from 'path'
import archiver from 'archiver'

export async function POST(request: NextRequest) {
  try {
    // Check authentication
    const session = await getServerSession(authOptions)
    if (!session?.user || session.user.role !== 'admin') {
      return NextResponse.json({ success: false, error: 'Unauthorized' }, { status: 401 })
    }

    // Define directories to backup
    const backupDirectories = [
      'public/uploads',
      'public/logos',
      'public/favicons',
      'public/thumbnails'
    ]

    // Create a zip archive
    const archive = archiver('zip', { zlib: { level: 9 } })
    
    // Set response headers for file download
    const headers = new Headers()
    headers.set('Content-Type', 'application/zip')
    headers.set('Content-Disposition', `attachment; filename="files-backup-${new Date().toISOString().split('T')[0]}.zip"`)

    const stream = new ReadableStream({
      start(controller) {
        archive.on('data', (chunk) => {
          controller.enqueue(chunk)
        })
        
        archive.on('end', () => {
          controller.close()
        })
        
        archive.on('error', (err) => {
          console.error('Archive error:', err)
          controller.error(err)
        })
      }
    })

    // Add directories to archive
    for (const dir of backupDirectories) {
      try {
        const fullPath = path.join(process.cwd(), dir)
        const stats = await fs.stat(fullPath)
        
        if (stats.isDirectory()) {
          archive.directory(fullPath, dir)
        }
      } catch (error) {
        // Directory doesn't exist, skip it
        console.log(`Directory ${dir} doesn't exist, skipping...`)
      }
    }

    // Finalize the archive
    archive.finalize()

    return new Response(stream, { headers })

  } catch (error) {
    console.error('Files backup error:', error)
    return NextResponse.json({ 
      success: false, 
      error: 'Failed to create files backup' 
    }, { status: 500 })
  }
}
