import { NextRequest, NextResponse } from 'next/server'
import { connectToDatabase } from '@/lib/mongodb'
import { connectMongoose } from '@/lib/mongodb'
import { ObjectId } from 'mongodb'
import { ExifExtractor } from '@/services/exif-extractor'
import { DatabaseOptimizer } from '@/services/database-optimizer'
import { CacheManager } from '@/services/cache-manager'
import { getCurrentUser } from '@/lib/access-control-server'
import { TagModel } from '@/lib/models/Tag'
import { PersonModel } from '@/lib/models/Person'
import { LocationModel } from '@/lib/models/Location'

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

    // Get current user for access control
    const user = await getCurrentUser()
    
    // Build query with publication status filtering
    const query: any = { 
      $or: [
        { albumId: objectId },
        { albumId: id }
      ]
    }
    
    // For public album pages, ALWAYS show only published photos
    // This ensures that even if an admin visits a public album URL, 
    // they only see published photos (drafts are only visible in admin panel)
    query.isPublished = true
    
    // Get photos for this album using the working logic
    const photosCollection = db.collection('photos')
    console.log(`Photos API: Looking for photos with albumId: ${id} or ObjectId: ${objectId}`)
    console.log(`Photos API: User role: ${user?.role || 'anonymous'}, Query:`, JSON.stringify(query, null, 2))
    
    const photos = await photosCollection
      .find(query)
      .sort({ uploadedAt: -1 })
      .toArray()
    
    console.log(`Photos API: Found ${photos.length} photos for album ${id}`)
    if (photos.length > 0) {
      console.log('Photos API: First photo sample:', {
        _id: photos[0]._id,
        filename: photos[0].filename,
        albumId: photos[0].albumId,
        isPublished: photos[0].isPublished,
        storage: photos[0].storage
      })
    }

    // Process photos for EXIF data extraction (on-demand)
    const processedPhotos = await ExifExtractor.processPhotosForExif(photos)

    // Populate tags, people, and location names
    await connectMongoose()
    
    // Get all unique tag IDs, people IDs, and location IDs
    const tagIds = new Set<string>()
    const peopleIds = new Set<string>()
    const locationIds = new Set<string>()
    
    processedPhotos.forEach((photo: any) => {
      if (photo.tags && Array.isArray(photo.tags)) {
        photo.tags.forEach((tagId: any) => {
          tagIds.add(String(tagId))
        })
      }
      if (photo.people && Array.isArray(photo.people)) {
        photo.people.forEach((personId: any) => {
          peopleIds.add(String(personId))
        })
      }
      if (photo.location) {
        locationIds.add(String(photo.location))
      }
    })

    // Fetch all tags, people, and locations
    const [tags, people, locations] = await Promise.all([
      TagModel.find({ _id: { $in: Array.from(tagIds).map(id => new ObjectId(id)) } }).lean(),
      PersonModel.find({ _id: { $in: Array.from(peopleIds).map(id => new ObjectId(id)) } }).lean(),
      LocationModel.find({ _id: { $in: Array.from(locationIds).map(id => new ObjectId(id)) } }).lean()
    ])

    // Create lookup maps
    const tagMap = new Map(tags.map(tag => [String(tag._id), tag.name]))
    const peopleMap = new Map(people.map(person => {
      const fullName = typeof person.fullName === 'string' 
        ? person.fullName 
        : (person.fullName?.en || person.fullName?.he || '')
      const firstName = typeof person.firstName === 'string'
        ? person.firstName
        : (person.firstName?.en || person.firstName?.he || '')
      return [String(person._id), fullName || firstName || 'Unknown']
    }))
    const locationMap = new Map(locations.map(location => {
      const name = typeof location.name === 'string'
        ? location.name
        : (location.name?.en || location.name?.he || '')
      return [String(location._id), {
        name,
        address: location.address,
        coordinates: location.coordinates
      }]
    }))

    // Populate photos with names
    const populatedPhotos = processedPhotos.map((photo: any) => {
      const populated: any = { ...photo }
      
      // Populate tags
      if (photo.tags && Array.isArray(photo.tags)) {
        populated.tags = photo.tags.map((tagId: any) => tagMap.get(String(tagId)) || tagId)
      }
      
      // Populate people
      if (photo.people && Array.isArray(photo.people)) {
        populated.people = photo.people.map((personId: any) => peopleMap.get(String(personId)) || personId)
      }
      
      // Populate location
      if (photo.location) {
        const locationData = locationMap.get(String(photo.location))
        if (locationData) {
          populated.location = locationData
        }
      }
      
      return populated
    })

    return NextResponse.json({
      success: true,
      data: populatedPhotos
    })
  } catch (error) {
    console.error('Failed to get album photos:', error)
    return NextResponse.json(
      { success: false, error: 'Failed to get album photos' },
      { status: 500 }
    )
  }
}
