import { NextRequest, NextResponse } from 'next/server'
import { connectToDatabase } from '@/lib/mongodb'
import { ObjectId } from 'mongodb'
import { getCurrentUser, buildAlbumAccessQuery } from '@/lib/access-control-server'
import { CacheManager } from '@/services/cache-manager'
import { DatabaseOptimizer } from '@/services/database-optimizer'

export async function GET(request: NextRequest) {
  try {
    const { db } = await connectToDatabase()
    const { searchParams } = new URL(request.url)
    
    const parentId = searchParams.get('parentId')
    const level = searchParams.get('level')
    const storageProvider = searchParams.get('storageProvider')
    const isPublic = searchParams.get('isPublic')
    const mine = searchParams.get('mine')
    
    // Get current user for access control
    const user = await getCurrentUser()
    
    console.log('Albums API Debug:', {
      parentId,
      level,
      storageProvider,
      isPublic,
      mine,
      url: request.url,
      user: user ? { id: user.id, role: user.role } : 'anonymous'
    })
    
    // Build base query
    const query: any = {}
    if (mine === 'true') {
      if (!user) {
        return NextResponse.json({ success: false, error: 'Unauthorized' }, { status: 401 })
      }
      // Match both string and ObjectId representations of createdBy
      try {
        const userObjectId = new ObjectId(user.id)
        query.$or = [
          { createdBy: user.id },
          { createdBy: userObjectId }
        ]
      } catch {
        query.createdBy = user.id
      }
      console.log('Albums API Applying mine=true filter for user:', user.id)
    }
    
    if (parentId) {
      if (parentId === 'root') {
        query.parentAlbumId = null
      } else {
        // Try both ObjectId and string to handle data type inconsistencies
        query.$or = [
          { parentAlbumId: new ObjectId(parentId) },
          { parentAlbumId: parentId }
        ]
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
    
    // Apply access control (admins see everything) unless explicitly requesting mine=true
    let finalQuery = query
    if (mine !== 'true') {
      if (user?.role !== 'admin') {
        const accessQuery = await buildAlbumAccessQuery(user)
        // If the base query already has $or (for parentId or createdBy variants), combine properly
        if (query.$or) {
          finalQuery = {
            $and: [
              { $or: query.$or },
              accessQuery
            ]
          }
        } else {
          finalQuery = { $and: [query, accessQuery] }
        }
      }
    } else {
      console.log('Albums API mine=true: skipping access control merge; using createdBy filter only')
    }
    
    // Get albums with hierarchy info using native MongoDB driver
    const collection = db.collection('albums')
    console.log('Albums API Final Query:', JSON.stringify(finalQuery, null, 2))
    
    const albums = await collection.find(finalQuery)
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
    
    // Calculate child album count and photo count for each album
    const albumsWithChildCount = await Promise.all(
      albums.map(async (album) => {
        // Count only public child albums to match what's displayed
        // Try both ObjectId and string to handle data type inconsistencies
        const childCountQuery = {
          $or: [
            { parentAlbumId: album._id },
            { parentAlbumId: album._id.toString() }
          ],
          isPublic: true
        }
        
        const childCount = await collection.countDocuments(childCountQuery)
        
        // Calculate actual photo count for this album
        const actualPhotoCount = await db.collection('photos').countDocuments({
          $or: [
            { albumId: album._id },
            { albumId: album._id.toString() }
          ],
          isPublished: true
        })
        
        return {
          ...album,
          childAlbumCount: childCount,
          photoCount: actualPhotoCount // Use calculated photo count instead of stored value
        }
      })
    )
    
    console.log('Albums API Found albums:', albums.length, albums.map(a => ({ 
      _id: a._id, 
      alias: a.alias, 
      isPublic: a.isPublic, 
      photoCount: a.photoCount,
      childAlbumCount: a.childAlbumCount
    })))
    
    // Create response with caching
    const response = NextResponse.json({
      success: true,
      data: albumsWithChildCount
    })
    
    // Apply cache headers based on whether this is public data
    const cacheType = isPublic === 'true' ? 'albums' : 'sensitive'
    return CacheManager.applyCacheHeaders(response, cacheType)
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
    const user = await getCurrentUser()
    if (!user) {
      return NextResponse.json(
        { success: false, error: 'Unauthorized' },
        { status: 401 }
      )
    }
    
    const {
      name,
      alias,
      description,
      isPublic = false,
      isFeatured = false,
      showExifData = true,
      storageProvider = 'local',
      parentAlbumId,
      order = 0,
      allowedGroups = [],
      allowedUsers = []
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
      parentAlbumId: parentAlbumId ? new ObjectId(parentAlbumId) : null,
      parentPath,
      level,
      order,
      createdBy: new ObjectId(user.id),
      tags: [],
      allowedGroups,
      allowedUsers: allowedUsers.map((userId: string) => new ObjectId(userId)),
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
