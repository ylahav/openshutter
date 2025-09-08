// Import & Sync functionality temporarily disabled
/*
import { NextRequest, NextResponse } from 'next/server'
import { getServerSession } from 'next-auth'
import { authOptions } from '@/lib/auth'
import { connectToDatabase } from '@/lib/mongodb'
import { GoogleDriveImportService } from '@/services/storage/google-drive-import'
import { ExifExtractor } from '@/services/exif-extractor'
import { ObjectId } from 'mongodb'

// Helper function to update album dates
async function updateAlbumDates(db: any) {
  try {
    const albums = await db.collection('albums').find({}).toArray()
    
    for (const album of albums) {
      // Find photos in this album
      const photos = await db.collection('photos').find({
        albumId: album._id,
        isPublished: true
      }).toArray()
      
      if (photos.length > 0) {
        // Filter photos that have EXIF dateTimeOriginal and sort by that date
        const photosWithExifDates = photos
          .filter((photo: any) => photo.exif && photo.exif.dateTimeOriginal)
          .sort((a: any, b: any) => new Date(a.exif.dateTimeOriginal).getTime() - new Date(b.exif.dateTimeOriginal).getTime())
        
        let firstPhotoDate, lastPhotoDate
        
        if (photosWithExifDates.length > 0) {
          firstPhotoDate = new Date(photosWithExifDates[0].exif.dateTimeOriginal)
          lastPhotoDate = new Date(photosWithExifDates[photosWithExifDates.length - 1].exif.dateTimeOriginal)
        } else {
          // Fallback to uploadedAt if no EXIF dates available
          const photosSortedByUpload = photos.sort((a: any, b: any) => new Date(a.uploadedAt).getTime() - new Date(b.uploadedAt).getTime())
          firstPhotoDate = new Date(photosSortedByUpload[0].uploadedAt)
          lastPhotoDate = new Date(photosSortedByUpload[photosSortedByUpload.length - 1].uploadedAt)
        }
        
        // Update album with date information
        await db.collection('albums').updateOne(
          { _id: album._id },
          { 
            $set: { 
              firstPhotoDate: firstPhotoDate,
              lastPhotoDate: lastPhotoDate,
              updatedAt: new Date()
            }
          }
        )
        
      }
    }
  } catch (error) {
    console.error('Error updating album dates:', error)
  }
}

interface ProgressUpdate {
  status?: 'scanning' | 'importing' | 'completed' | 'error'
  currentStep?: string
  progress?: number
  totalItems?: number
  processedItems?: number
  albumsCreated?: number
  photosImported?: number
  scannedAlbums?: number
  scannedPhotos?: number
  currentItem?: string
  newErrors?: string[]
}

// GET endpoint to scan folders and return them for selection
export async function GET(request: NextRequest) {
  try {
    // Check authentication
    const session = await getServerSession(authOptions)
    if (!session?.user || session.user.role !== 'admin') {
      return NextResponse.json({ success: false, error: 'Unauthorized' }, { status: 401 })
    }

    const { db } = await connectToDatabase()
    
    // Get Google Drive configuration from database
    const storageConfig = await db.collection('storage_configs').findOne({
      providerId: 'google-drive',
      isEnabled: true
    })
    
    if (!storageConfig) {
      return NextResponse.json({ 
        success: false, 
        error: 'Google Drive configuration not found. Please configure Google Drive in Storage Settings first.' 
      }, { status: 400 })
    }
    
    // Create GoogleDriveImportService instance with the configuration
    const importService = new GoogleDriveImportService({
      clientId: storageConfig.config.clientId,
      clientSecret: storageConfig.config.clientSecret,
      refreshToken: storageConfig.config.refreshToken,
      folderId: storageConfig.config.folderId,
      isEnabled: storageConfig.isEnabled
    })

    // Scan only folders (no files)
    const folders = await importService.listImportFolders()

    // Return scanned data for selection
    return NextResponse.json({
      success: true,
      data: {
        folders: folders.map(folder => ({
          id: folder.id,
          name: folder.name,
          path: folder.path,
          parentPath: folder.parentPath,
          level: (folder.path.match(/\//g) || []).length
        }))
      }
    })

  } catch (error) {
    console.error('Error scanning Google Drive:', error)
    return NextResponse.json({ 
      success: false, 
      error: error instanceof Error ? error.message : 'Failed to scan Google Drive' 
    }, { status: 500 })
  }
}

export async function POST(request: NextRequest) {
  try {
    // Check authentication
    const session = await getServerSession(authOptions)
    if (!session?.user || session.user.role !== 'admin') {
      return NextResponse.json({ success: false, error: 'Unauthorized' }, { status: 401 })
    }

    const { db } = await connectToDatabase()
    
    // Get Google Drive configuration from database
    const storageConfig = await db.collection('storage_configs').findOne({
      providerId: 'google-drive',
      isEnabled: true
    })
    
    if (!storageConfig) {
      return NextResponse.json({ 
        success: false, 
        error: 'Google Drive configuration not found. Please configure Google Drive in Storage Settings first.' 
      }, { status: 400 })
    }
    
    // Create GoogleDriveImportService instance with the configuration
    const importService = new GoogleDriveImportService({
      clientId: storageConfig.config.clientId,
      clientSecret: storageConfig.config.clientSecret,
      refreshToken: storageConfig.config.refreshToken,
      folderId: storageConfig.config.folderId,
      isEnabled: storageConfig.isEnabled
    })
    // ExifExtractor has static methods, no need to instantiate

    // Parse request body to get selected folders
    const body = await request.json()
    const { selectedFolders = [] } = body

    if (selectedFolders.length === 0) {
      return NextResponse.json({ 
        success: false, 
        error: 'No folders selected for import' 
      }, { status: 400 })
    }

    // Create a readable stream for progress updates
    const stream = new ReadableStream({
      async start(controller) {
        const encoder = new TextEncoder()
        let isControllerClosed = false
        
        const sendProgress = (update: ProgressUpdate) => {
          if (isControllerClosed) {
            return
          }
          
          try {
            const data = `data: ${JSON.stringify(update)}\n\n`
            controller.enqueue(encoder.encode(data))
          } catch (error) {
            console.error('Error sending progress update:', error)
            isControllerClosed = true
          }
        }

        try {
          // Initialize progress
          sendProgress({
            status: 'importing',
            currentStep: `Processing ${selectedFolders.length} selected folders...`,
            progress: 0,
            totalItems: selectedFolders.length,
            processedItems: 0,
            albumsCreated: 0,
            photosImported: 0,
            scannedAlbums: 0,
            scannedPhotos: 0,
            newErrors: []
          })

          // Process only the selected folders without re-scanning
          // The selectedFolders array contains the full data from the GET request
          const selectedFolderData = selectedFolders

          // Sort folders by path depth to ensure parent folders are created first
          const sortedFolders = selectedFolderData.sort((a: any, b: any) => {
            const aDepth = (a.path.match(/\//g) || []).length
            const bDepth = (b.path.match(/\//g) || []).length
            return aDepth - bDepth
          })

          let processedItems = 0
          let albumsCreated = 0
          let photosImported = 0
          let emptyFolders = 0
          let scannedAlbums = 0
          let scannedPhotos = 0
          const errors: string[] = []

          // Process folders first (to create albums) in hierarchical order
          for (const folder of sortedFolders) {
            try {
              // Generate consistent alias for this folder
              const folderAlias = folder.name.toLowerCase().replace(/[^a-z0-9]/g, '-').replace(/-+/g, '-').replace(/^-|-$/g, '')
              
              // Check if album already exists by both storage path and alias
              const existingAlbum = await db.collection('albums').findOne({
                $or: [
                  {
                    'storage.provider': 'google-drive',
                    'storage.path': folder.path
                  },
                  {
                    'storage.provider': 'google-drive',
                    'storage.folderId': folder.id
                  },
                  {
                    alias: folderAlias
                  }
                ]
              })

              if (!existingAlbum) {
                // Find parent album ID - now safe because we process in hierarchical order
                let parentAlbumId = null
                if (folder.parentPath && folder.parentPath !== '/') {
                  const parentAlbum = await db.collection('albums').findOne({
                    'storage.provider': 'google-drive',
                    'storage.path': folder.parentPath
                  })
                  parentAlbumId = parentAlbum ? new ObjectId(parentAlbum._id) : null
                }
                
                // Create album from folder
                const albumData = {
                  name: { en: folder.name, he: folder.name },
                  alias: folderAlias,
                  description: { en: `Imported from Google Drive folder: ${folder.name}`, he: `יובא מתיקיית Google Drive: ${folder.name}` },
                  storage: {
                    provider: 'google-drive',
                    path: folder.path,
                    folderId: folder.id
                  },
                  parentAlbumId: parentAlbumId, // Fixed: use parentAlbumId instead of parentAlbum
                  isPublic: true,
                  isFeatured: false,
                  createdAt: new Date(),
                  updatedAt: new Date()
                }

                await db.collection('albums').insertOne(albumData)
                albumsCreated++
              } else {
                // Album already exists
              }

              // Now scan for photos in this folder
              scannedAlbums++ // Increment scanned albums count
              sendProgress({
                currentStep: `Scanning photos in: ${folder.name}`,
                progress: Math.round((processedItems / selectedFolders.length) * 100),
                processedItems,
                albumsCreated,
                photosImported,
                scannedAlbums,
                scannedPhotos,
                currentItem: folder.name
              })

              try {
                // Get files in this specific folder
                const folderFiles = await importService.listImportFiles(folder.id)
                const imageFiles = folderFiles.filter(file => isImageFile(file.name))
                
                scannedPhotos += imageFiles.length // Add to scanned photos count
                
                if (imageFiles.length === 0) {
                  emptyFolders++
                } else {
                  // Process photos in this folder
                  for (const file of imageFiles) {
                    try {
                      // Check if photo already exists
                      const existingPhoto = await db.collection('photos').findOne({
                        $or: [
                          { 'storage.provider': 'google-drive', 'storage.path': file.path },
                          { filename: file.name }
                        ]
                      })

                      if (existingPhoto) {
                        continue
                      }

                      // Find the album for this photo
                      const album = await db.collection('albums').findOne({
                        'storage.provider': 'google-drive',
                        'storage.path': file.parentPath
                      })

                      if (!album) {
                        continue
                      }

                      // Extract EXIF data
                      let exifData = null
                      try {
                        const fileBuffer = await importService.getImportFileBuffer(file.id)
                        if (fileBuffer) {
                          exifData = await ExifExtractor.extractExifData(fileBuffer)
                        }
                      } catch (exifError) {
                        console.warn(`  - Failed to extract EXIF for ${file.name}:`, exifError)
                      }

                      // Create photo record
                      const photoData = {
                        title: { en: file.name, he: file.name },
                        description: { en: '', he: '' },
                        filename: file.name,
                        originalFilename: file.name,
                        mimeType: file.mimeType,
                        size: file.size,
                        dimensions: {
                          width: 0,
                          height: 0
                        },
                        storage: {
                          provider: 'google-drive',
                          fileId: file.id,
                          url: `/api/storage/serve/google-drive/${encodeURIComponent(file.path)}`,
                          path: file.path,
                          thumbnailPath: `/api/storage/serve/google-drive/${encodeURIComponent(file.path)}`
                        },
                        albumId: new ObjectId(album._id),
                        tags: [],
                        isPublished: true,
                        isLeading: false,
                        isGalleryLeading: false,
                        uploadedBy: session.user.email || 'system',
                        uploadedAt: new Date(),
                        updatedAt: new Date(),
                        exif: exifData
                      }

                      const insertResult = await db.collection('photos').insertOne(photoData)
                      photosImported++

                    } catch (photoError) {
                      console.error(`❌ Failed to process photo ${file.name}:`, photoError)
                      errors.push(`Failed to process photo ${file.name}: ${photoError}`)
                    }
                  }
                }
              } catch (scanError) {
                console.error(`❌ Failed to scan photos in folder ${folder.name}:`, scanError)
                errors.push(`Failed to scan photos in folder ${folder.name}: ${scanError}`)
              }

              processedItems++
              sendProgress({
                currentStep: `Completed folder: ${folder.name}`,
                progress: Math.round((processedItems / selectedFolders.length) * 100),
                processedItems,
                albumsCreated,
                photosImported,
                scannedAlbums,
                scannedPhotos,
                currentItem: folder.name
              })
            } catch (error) {
              errors.push(`Failed to process folder ${folder.name}: ${error}`)
              processedItems++
            }
          }

          // Update album dates after photos are imported
          if (photosImported > 0) {
            await updateAlbumDates(db)
          }

          // Final progress update
          let completionMessage = `Import completed! Created ${albumsCreated} albums`
          if (photosImported > 0) {
            completionMessage += ` and imported ${photosImported} photos`
          }
          if (emptyFolders > 0) {
            completionMessage += `. ${emptyFolders} folders were empty`
          }
          completionMessage += '.'

          sendProgress({
            status: 'completed',
            currentStep: completionMessage,
            progress: 100,
            totalItems: selectedFolders.length,
            processedItems,
            albumsCreated,
            photosImported,
            scannedAlbums,
            scannedPhotos,
            newErrors: errors
          })

        } catch (error) {
          console.error('Import process error:', error)
          sendProgress({
            status: 'error',
            currentStep: `Import failed: ${error}`,
            newErrors: [error instanceof Error ? error.message : String(error)]
          })
        } finally {
          if (!isControllerClosed) {
            try {
              controller.close()
              isControllerClosed = true
            } catch (closeError) {
              console.error('Error closing controller:', closeError)
            }
          }
        }
      }
    })

    return new Response(stream, {
      headers: {
        'Content-Type': 'text/event-stream',
        'Cache-Control': 'no-cache',
        'Connection': 'keep-alive',
      },
    })

  } catch (error) {
    console.error('Google Drive import error:', error)
    return NextResponse.json({ 
      success: false, 
      error: 'Failed to start Google Drive import' 
    }, { status: 500 })
  }
}


// Helper function to check if file is an image
function isImageFile(filename: string): boolean {
  const imageExtensions = ['.jpg', '.jpeg', '.png', '.gif', '.bmp', '.webp', '.tiff', '.tif']
  const ext = filename.toLowerCase().substring(filename.lastIndexOf('.'))
  return imageExtensions.includes(ext)
}
*/

// Temporary placeholder functions to prevent build errors
export async function GET() {
  return new Response(JSON.stringify({ 
    success: false, 
    error: 'Import & Sync functionality is temporarily disabled' 
  }), {
    status: 503,
    headers: { 'Content-Type': 'application/json' }
  })
}

export async function POST() {
  return new Response(JSON.stringify({ 
    success: false, 
    error: 'Import & Sync functionality is temporarily disabled' 
  }), {
    status: 503,
    headers: { 'Content-Type': 'application/json' }
  })
}
