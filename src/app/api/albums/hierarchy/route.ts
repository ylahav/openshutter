import { NextRequest, NextResponse } from 'next/server'
import { connectToDatabase } from '@/lib/mongodb'

interface AlbumNode {
  _id: string
  name: string
  alias: string
  description?: string
  isPublic: boolean
  isFeatured: boolean
  storageProvider: string
  storagePath: string
  level: number
  order: number
  photoCount: number
  createdBy: string
  children?: AlbumNode[]
}

export async function GET(request: NextRequest) {
  try {
    const { db } = await connectToDatabase()
    const { searchParams } = new URL(request.url)
    
    const includePrivate = searchParams.get('includePrivate') === 'true'
    const storageProvider = searchParams.get('storageProvider')
    
    // Build query
    const query: any = {}
    
    if (!includePrivate) {
      query.isPublic = true
    }
    
    if (storageProvider) {
      query.storageProvider = storageProvider
    }
    
    // Get all albums using native MongoDB driver
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
        level: 1,
        order: 1,
        photoCount: 1,
        createdBy: 1
      })
      .toArray()
    
    // Build hierarchy tree
    const buildTree = (parentId: string | null = null): AlbumNode[] => {
      const nodes: AlbumNode[] = []
      
      for (const album of albums) {
        if (album.parentAlbumId?.toString() === parentId?.toString()) {
          const node: AlbumNode = {
            _id: album._id.toString(),
            name: album.name,
            alias: album.alias,
            description: album.description,
            isPublic: album.isPublic,
            isFeatured: album.isFeatured,
            storageProvider: album.storageProvider,
            storagePath: album.storagePath,
            level: album.level,
            order: album.order,
            photoCount: album.photoCount,
            createdBy: album.createdBy,
            children: buildTree(album._id)
          }
          nodes.push(node)
        }
      }
      
      return nodes.sort((a, b) => a.order - b.order)
    }
    
    const tree = buildTree()
    
    return NextResponse.json({
      success: true,
      data: tree
    })
  } catch (error) {
    console.error('Failed to get album hierarchy:', error)
    return NextResponse.json(
      { success: false, error: 'Failed to get album hierarchy' },
      { status: 500 }
    )
  }
}
