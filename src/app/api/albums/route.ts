import { NextRequest, NextResponse } from 'next/server'
import { connectToDatabase } from '@/lib/mongodb'
import { ObjectId } from 'mongodb'

export async function GET(request: NextRequest) {
  try {
    const { db } = await connectToDatabase()
    const { searchParams } = new URL(request.url)
    
    const parentId = searchParams.get('parentId')
    const level = searchParams.get('level')
    const storageProvider = searchParams.get('storageProvider')
    const isPublic = searchParams.get('isPublic')
    
    // Build query
    const query: any = {}
    
    if (parentId) {
      if (parentId === 'root') {
        query.parentAlbumId = null
      } else {
        query.parentAlbumId = new ObjectId(parentId)
      }
    }
    
    if (level !== null) {
      query.level = parseInt(level)
    }
    
    if (storageProvider) {
      query.storageProvider = storageProvider
    }
    
    if (isPublic !== null) {
      query.isPublic = isPublic === 'true'
    }
    
    // Get albums with hierarchy info using native MongoDB driver
    const collection = db.collection('albums')
    const albums = await collection.find(query)
      .sort({ level: 1, order: 1, name: 1 })
      .project({
        _id: 1,
        name: 1,
        alias: 1,
        description: 1,
        isPublic: 1,
        isFeatured: 1,
        storageProvider: 1,
        storagePath: 1,
        parentAlbumId: 1,
        parentPath: 1,
        level: 1,
        order: 1,
        coverPhotoId: 1,
        photoCount: 1,
        createdAt: 1
      })
      .toArray()
    
    // Calculate child album count for each album
    const albumsWithChildCount = await Promise.all(
      albums.map(async (album) => {
        // Try both ObjectId and string comparison
        let childCount = await collection.countDocuments({ 
          parentAlbumId: album._id 
        })
        
        // If no results with ObjectId, try with string
        if (childCount === 0) {
          childCount = await collection.countDocuments({ 
            parentAlbumId: album._id.toString() 
          })
        }
        
        return {
          ...album,
          childAlbumCount: childCount
        }
      })
    )
    
    return NextResponse.json({
      success: true,
      data: albumsWithChildCount
    })
  } catch (error) {
    console.error('Failed to get albums:', error)
    return NextResponse.json(
      { success: false, error: 'Failed to get albums' },
      { status: 500 }
    )
  }
}

export async function POST(request: NextRequest) {
  try {
    const { db } = await connectToDatabase()
    const body = await request.json()
    
    const {
      name,
      alias,
      description,
      isPublic = false,
      isFeatured = false,
      showExifData = true,
      storageProvider = 'local',
      parentAlbumId,
      order = 0
    } = body
    
    // Validation
    if (!name || !alias) {
      return NextResponse.json(
        { success: false, error: 'Name and alias are required' },
        { status: 400 }
      )
    }
    
    // Check if alias already exists using native MongoDB driver
    const collection = db.collection('albums')
    const existingAlbum = await collection.findOne({ alias })
    if (existingAlbum) {
      return NextResponse.json(
        { success: false, error: 'Album alias already exists' },
        { status: 400 }
      )
    }
    
    // Calculate hierarchy info
    let level = 0
    let parentPath = ''
    
    if (parentAlbumId) {
      let parentAlbum
      
      try {
        parentAlbum = await collection.findOne({ _id: new ObjectId(parentAlbumId) })
      } catch (error) {
        console.error('Invalid ObjectId format:', error)
        return NextResponse.json(
          { success: false, error: 'Invalid parent album ID format' },
          { status: 400 }
        )
      }
      
      if (!parentAlbum) {
        return NextResponse.json(
          { success: false, error: 'Parent album not found' },
          { status: 400 }
        )
      }
      
      level = parentAlbum.level + 1
      parentPath = parentAlbum.storagePath
    }
    
    // Build storage path
    const storagePath = parentPath ? `${parentPath}/${alias}` : alias
    
    // Create album using native MongoDB driver
    const album = {
      name,
      alias: alias.toLowerCase(),
      description,
      isPublic,
      isFeatured,
      showExifData,
      storageProvider,
      storagePath,
      parentAlbumId: parentAlbumId || null,
      parentPath,
      level,
      order,
      createdBy: 'admin', // TODO: Get from authentication
      tags: [],
      photoCount: 0,
      createdAt: new Date(),
      updatedAt: new Date()
    }
    
    const result = await collection.insertOne(album)
    
    // Create storage folder if needed
    if (storageProvider !== 'local') {
      try {
        const { storageManager } = await import('@/services/storage/manager')
        const storageService = await storageManager.getProvider(storageProvider as 'google-drive' | 'aws-s3')
        
        // Create the album folder
        await storageService.createFolder(alias, parentPath)
      } catch (error) {
        console.error(`Failed to create storage folder for album ${alias}:`, error)
        // Don't fail the album creation if folder creation fails
      }
    }
    
    return NextResponse.json({
      success: true,
      message: 'Album created successfully',
      data: { ...album, _id: result.insertedId }
    })
  } catch (error) {
    console.error('Failed to create album:', error)
    return NextResponse.json(
      { success: false, error: 'Failed to create album' },
      { status: 500 }
    )
  }
}
