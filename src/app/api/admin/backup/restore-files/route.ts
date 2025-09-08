import { NextRequest, NextResponse } from 'next/server'
import { getServerSession } from 'next-auth'
import { authOptions } from '@/lib/auth'
import { promises as fs, createWriteStream } from 'fs'
import path from 'path'
import { pipeline } from 'stream'
import { promisify } from 'util'
import yauzl from 'yauzl'

const pipelineAsync = promisify(pipeline)

export async function POST(request: NextRequest) {
  try {
    // Check authentication
    const session = await getServerSession(authOptions)
    if (!session?.user || session.user.role !== 'admin') {
      return NextResponse.json({ success: false, error: 'Unauthorized' }, { status: 401 })
    }

    const formData = await request.formData()
    const file = formData.get('backup') as File
    
    if (!file) {
      return NextResponse.json({ 
        success: false, 
        error: 'No backup file provided' 
      }, { status: 400 })
    }

    // Convert File to Buffer
    const buffer = Buffer.from(await file.arrayBuffer())
    
    // Extract zip file
    return new Promise<NextResponse>((resolve) => {
      yauzl.fromBuffer(buffer, { lazyEntries: true }, (err, zipfile) => {
        if (err) {
          console.error('Zip extraction error:', err)
          resolve(NextResponse.json({ 
            success: false, 
            error: 'Failed to extract backup file' 
          }, { status: 500 }))
          return
        }

        const extractedFiles: string[] = []
        
        zipfile.readEntry()
        zipfile.on('entry', (entry) => {
          if (/\/$/.test(entry.fileName)) {
            // Directory entry
            zipfile.readEntry()
          } else {
            // File entry
            zipfile.openReadStream(entry, (err, readStream) => {
              if (err) {
                console.error('Error reading file from zip:', err)
                zipfile.readEntry()
                return
              }

              const outputPath = path.join(process.cwd(), entry.fileName)
              const outputDir = path.dirname(outputPath)
              
              // Ensure directory exists
              fs.mkdir(outputDir, { recursive: true }).then(() => {
                const writeStream = createWriteStream(outputPath)
                
                readStream.pipe(writeStream)
                writeStream.on('close', () => {
                  extractedFiles.push(entry.fileName)
                  zipfile.readEntry()
                })
                writeStream.on('error', (err) => {
                  console.error('Error writing file:', err)
                  zipfile.readEntry()
                })
              }).catch((err) => {
                console.error('Error creating directory:', err)
                zipfile.readEntry()
              })
            })
          }
        })

        zipfile.on('end', () => {
          resolve(NextResponse.json({ 
            success: true, 
            message: `Files restored successfully. Extracted ${extractedFiles.length} files.`,
            extractedFiles
          }))
        })

        zipfile.on('error', (err) => {
          console.error('Zip file error:', err)
          resolve(NextResponse.json({ 
            success: false, 
            error: 'Failed to process backup file' 
          }, { status: 500 }))
        })
      })
    })

  } catch (error) {
    console.error('Files restore error:', error)
    return NextResponse.json({ 
      success: false, 
      error: 'Failed to restore files' 
    }, { status: 500 })
  }
}
