import { NextRequest, NextResponse } from 'next/server'
import { connectToDatabase } from '@/lib/mongodb'
import { ObjectId } from 'mongodb'
import { storageConfigService } from '@/services/storage/config'

export async function GET(
  request: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  try {
    const { id } = await params
    const { db } = await connectToDatabase()
    
    if (!id) {
      return NextResponse.json(
        { success: false, error: 'Album ID is required' },
        { status: 400 }
      )
    }

    let objectId
    try {
      objectId = new ObjectId(id)
    } catch (error) {
      return NextResponse.json(
        { success: false, error: 'Invalid album ID format' },
        { status: 400 }
      )
    }

    const collection = db.collection('albums')
    const album = await collection.findOne({ _id: objectId })
    
    if (!album) {
      return NextResponse.json(
        { success: false, error: 'Album not found' },
        { status: 404 }
      )
    }

    return NextResponse.json({
      success: true,
      data: album
    })
  } catch (error) {
    console.error('Failed to get album:', error)
    return NextResponse.json(
      { success: false, error: 'Failed to get album' },
      { status: 500 }
    )
  }
}

export async function PUT(
  request: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  try {
    const { id } = await params
    const { db } = await connectToDatabase()
    const body = await request.json()
    
    if (!id) {
      return NextResponse.json(
        { success: false, error: 'Album ID is required' },
        { status: 400 }
      )
    }

    let objectId
    try {
      objectId = new ObjectId(id)
    } catch (error) {
      return NextResponse.json(
        { success: false, error: 'Invalid album ID format' },
        { status: 400 }
      )
    }

    const {
      name,
      description,
      isPublic,
      isFeatured,
      showExifData,
      order
    } = body

    // Build update object
    const updateData: any = {
      updatedAt: new Date()
    }

    if (name !== undefined) updateData.name = name
    if (description !== undefined) updateData.description = description
    if (isPublic !== undefined) updateData.isPublic = isPublic
    if (isFeatured !== undefined) updateData.isFeatured = isFeatured
    if (showExifData !== undefined) updateData.showExifData = showExifData
    if (order !== undefined) updateData.order = order

    const collection = db.collection('albums')
    const result = await collection.updateOne(
      { _id: objectId },
      { $set: updateData }
    )

    if (result.matchedCount === 0) {
      return NextResponse.json(
        { success: false, error: 'Album not found' },
        { status: 404 }
      )
    }

    // Get updated album
    const updatedAlbum = await collection.findOne({ _id: objectId })

    return NextResponse.json({
      success: true,
      message: 'Album updated successfully',
      data: updatedAlbum
    })
  } catch (error) {
    console.error('Failed to update album:', error)
    return NextResponse.json(
      { success: false, error: 'Failed to update album' },
      { status: 500 }
    )
  }
}

export async function DELETE(
  request: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  try {
    const { id } = await params
    const url = new URL(request.url)
    const deleteFromStorage = url.searchParams.get('deleteFromStorage') === 'true'
    const { db } = await connectToDatabase()
    
    if (!id) {
      return NextResponse.json(
        { success: false, error: 'Album ID is required' },
        { status: 400 }
      )
    }

    let objectId
    try {
      objectId = new ObjectId(id)
    } catch (error) {
      return NextResponse.json(
        { success: false, error: 'Invalid album ID format' },
        { status: 400 }
      )
    }

    const collection = db.collection('albums')
    
    // Check if album has children
    const childrenCount = await collection.countDocuments({ parentAlbumId: id })
    if (childrenCount > 0) {
      return NextResponse.json(
        { success: false, error: 'Cannot delete album with child albums. Please delete child albums first.' },
        { status: 400 }
      )
    }

    // Check if album has photos
    // TODO: Implement photo count check when photos are connected
    
    // Get album details before deletion for cleanup
    const album = await collection.findOne({ _id: objectId })
    
    const result = await collection.deleteOne({ _id: objectId })

    if (result.deletedCount === 0) {
      return NextResponse.json(
        { success: false, error: 'Album not found' },
        { status: 404 }
      )
    }

    // Delete album folder from storage if requested
    if (deleteFromStorage && album?.storagePath) {
      try {
        const fs = require('fs/promises')
        const path = require('path')
        
        // Get local storage configuration
        const localConfig = await storageConfigService.getConfig('local')
        if (!localConfig) {
          console.error('Local storage configuration not found')
          return NextResponse.json(
            { success: false, error: 'Storage configuration not found' },
            { status: 500 }
          )
        }
        
        const basePath = localConfig.config.basePath
        const albumPath = path.isAbsolute(basePath)
          ? path.join(basePath, album.storagePath)
          : path.join(process.cwd(), basePath, album.storagePath)
        
        // Delete the entire album folder recursively
        await fs.rm(albumPath, { recursive: true, force: true })
      } catch (storageError) {
        console.error('Failed to delete album folder from storage:', storageError)
        // Continue with database deletion even if storage deletion fails
      }
    }

    return NextResponse.json({
      success: true,
      message: 'Album deleted successfully'
    })
  } catch (error) {
    console.error('Failed to delete album:', error)
    return NextResponse.json(
      { success: false, error: 'Failed to delete album' },
      { status: 500 }
    )
  }
}
