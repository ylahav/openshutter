import { NextRequest, NextResponse } from 'next/server'
import { connectToDatabase } from '@/lib/mongodb'
import { connectMongoose } from '@/lib/mongodb'
import { ObjectId } from 'mongodb'
import { ExifExtractor } from '@/services/exif-extractor'
import { getCurrentUser, checkAlbumAccess } from '@/lib/access-control-server'
import { writeAuditLog } from '@/services/audit-log'
import { TagModel } from '@/lib/models/Tag'
import { PersonModel } from '@/lib/models/Person'
import { LocationModel } from '@/lib/models/Location'

export async function GET(
  request: NextRequest,
  { params }: { params: Promise<{ alias: string }> }
) {
  try {
    const { alias } = await params
    const { searchParams } = new URL(request.url)
    
    // Pagination parameters
    const page = parseInt(searchParams.get('page') || '1')
    const limit = parseInt(searchParams.get('limit') || '16')
    const skip = (page - 1) * limit
    
    const { db } = await connectToDatabase()
    
    // First get the album to check access
    const album = await db.collection('albums').findOne(
      { alias },
      {
        projection: {
          _id: 1,
          isPublic: 1,
          allowedGroups: 1,
          allowedUsers: 1
        }
      }
    )
    
    if (!album) {
      return NextResponse.json(
        { success: false, error: 'Album not found' },
        { status: 404 }
      )
    }

    // Check access control (admins can access everything)
    const user = await getCurrentUser()
    if (user?.role !== 'admin') {
      const hasAccess = await checkAlbumAccess({
        isPublic: album.isPublic,
        allowedGroups: album.allowedGroups,
        allowedUsers: album.allowedUsers
      }, user)

      if (!hasAccess) {
        await writeAuditLog({
          action: 'photo.view.deny',
          userId: user?.id ?? null,
          userRole: user?.role ?? null,
          ip: request.headers.get('x-forwarded-for') || request.headers.get('x-real-ip') || undefined,
          userAgent: request.headers.get('user-agent'),
          resourceType: 'photo',
          resourceId: album._id?.toString?.() ?? null,
          resourceAlias: alias,
          details: { reason: 'access_denied' }
        })
        return NextResponse.json(
          { success: false, error: 'Access denied' },
          { status: 403 }
        )
      }
      await writeAuditLog({
        action: 'photo.view.allow',
        userId: user?.id ?? null,
        userRole: user?.role ?? null,
        ip: request.headers.get('x-forwarded-for') || request.headers.get('x-real-ip') || undefined,
        userAgent: request.headers.get('user-agent'),
        resourceType: 'photo',
        resourceId: album._id?.toString?.() ?? null,
        resourceAlias: alias,
        details: { isPublic: album.isPublic === true, page, limit }
      })
    }

    // Get total count for pagination (handle both string and ObjectId albumId formats)
    const totalPhotos = await db.collection('photos').countDocuments({
      $or: [
        { albumId: album._id },
        { albumId: album._id.toString() }
      ],
      isPublished: true
    })

    // Get photos for this album with pagination (only published ones for public view)
    const photos = await db.collection('photos')
      .find({ 
        $or: [
          { albumId: album._id },
          { albumId: album._id.toString() }
        ],
        isPublished: true 
      })
      .sort({ createdAt: -1 })
      .skip(skip)
      .limit(limit)
      .toArray()

    
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
    
    // Calculate pagination info
    const totalPages = Math.ceil(totalPhotos / limit)
    const hasNextPage = page < totalPages
    const hasPrevPage = page > 1
    
    return NextResponse.json({ 
      success: true, 
      data: populatedPhotos,
      pagination: {
        page,
        limit,
        total: totalPhotos,
        totalPages,
        hasNextPage,
        hasPrevPage
      }
    })
  } catch (error) {
    console.error('API: Error getting photos by album alias:', error)
    return NextResponse.json(
      { success: false, error: 'Failed to get photos' },
      { status: 500 }
    )
  }
}
