import { NextRequest, NextResponse } from 'next/server'
import { connectToDatabase } from '@/lib/mongodb'
import { ObjectId } from 'mongodb'
import { getCurrentUser, buildAlbumAccessQuery } from '@/lib/access-control-server'
import { DatabaseOptimizer } from '@/services/database-optimizer'
import { PersonModel } from '@/lib/models/Person'
import { TagModel } from '@/lib/models/Tag'
import { LocationModel } from '@/lib/models/Location'
import { SUPPORTED_LANGUAGES } from '@/types/multi-lang'

export async function GET(request: NextRequest) {
  try {
    const { searchParams } = new URL(request.url)
    const { db } = await connectToDatabase()
    
    // Get search parameters
    const query = searchParams.get('q') || ''
        const type = searchParams.get('type') || 'all' // 'photos', 'albums', 'people', 'locations', 'all'
    const page = parseInt(searchParams.get('page') || '1')
    const limit = parseInt(searchParams.get('limit') || '20')
    const sortBy = searchParams.get('sortBy') || 'relevance'
    const sortOrder = searchParams.get('sortOrder') || 'desc'
    
    // Filter parameters
    const tagIds = searchParams.get('tags')?.split(',').filter(Boolean).map(id => new ObjectId(id)) || []
    const albumId = searchParams.get('albumId')
    const dateFrom = searchParams.get('dateFrom')
    const dateTo = searchParams.get('dateTo')
    const storageProvider = searchParams.get('storageProvider')
    const isPublic = searchParams.get('isPublic')
    const mine = searchParams.get('mine') === 'true'
    
    // Get current user for access control
    const user = await getCurrentUser()
    
    const results: any = {
      photos: [],
      albums: [],
      people: [],
      locations: [],
      totalPhotos: 0,
      totalAlbums: 0,
      totalPeople: 0,
      totalLocations: 0,
      page,
      limit,
      hasMore: false
    }
    
    // Search photos
    if (type === 'photos' || type === 'all') {
      const photoFilters: any = {}
      
      if (tagIds.length > 0) {
        photoFilters.tags = tagIds
      }
      
      if (albumId) {
        photoFilters.albumId = albumId
      }
      
      if (dateFrom || dateTo) {
        photoFilters.dateRange = {
          start: dateFrom ? new Date(dateFrom) : new Date('1900-01-01'),
          end: dateTo ? new Date(dateTo) : new Date()
        }
      }
      
      const photos = await DatabaseOptimizer.searchPhotos(
        query,
        photoFilters,
        { limit, skip: (page - 1) * limit }
      )
      
      // Apply additional filters
      let filteredPhotos = photos
      
      if (storageProvider) {
        filteredPhotos = filteredPhotos.filter(photo => 
          photo.storage?.provider === storageProvider
        )
      }
      
      if (isPublic !== null) {
        filteredPhotos = filteredPhotos.filter(photo => 
          photo.isPublished === (isPublic === 'true')
        )
      }
      
      if (mine && user) {
        filteredPhotos = filteredPhotos.filter(photo => 
          photo.uploadedBy?.toString() === user.id
        )
      }
      
      // Apply sorting
      if (sortBy === 'date') {
        filteredPhotos.sort((a, b) => {
          const aDate = new Date(a.uploadedAt).getTime()
          const bDate = new Date(b.uploadedAt).getTime()
          return sortOrder === 'asc' ? aDate - bDate : bDate - aDate
        })
      } else if (sortBy === 'filename') {
        filteredPhotos.sort((a, b) => {
          const comparison = a.filename.localeCompare(b.filename)
          return sortOrder === 'asc' ? comparison : -comparison
        })
      } else if (sortBy === 'size') {
        filteredPhotos.sort((a, b) => {
          return sortOrder === 'asc' ? a.size - b.size : b.size - a.size
        })
      }
      
      results.photos = filteredPhotos
      results.totalPhotos = filteredPhotos.length
    }
    
    // Search albums
    if (type === 'albums' || type === 'all') {
      let albumQuery: any = {}
      
      // Text search in album names and descriptions
      if (query) {
        albumQuery.$or = [
          { name: { $regex: query, $options: 'i' } },
          { description: { $regex: query, $options: 'i' } },
          { alias: { $regex: query, $options: 'i' } }
        ]
      }
      
      // Apply filters
      if (tagIds.length > 0) {
        albumQuery.tags = { $in: tagIds }
      }
      
      if (storageProvider) {
        albumQuery.storageProvider = storageProvider
      }
      
      if (isPublic !== null) {
        albumQuery.isPublic = isPublic === 'true'
      }
      
      if (mine && user) {
        try {
          const userObjectId = new ObjectId(user.id)
          albumQuery.$or = [
            { createdBy: user.id },
            { createdBy: userObjectId }
          ]
        } catch {
          albumQuery.createdBy = user.id
        }
      }
      
      // Apply access control for non-admin users
      if (user?.role !== 'admin') {
        const accessQuery = await buildAlbumAccessQuery(user)
        albumQuery = { $and: [albumQuery, accessQuery] }
      }
      
      // Get albums with pagination
      const albums = await db.collection('albums')
        .find(albumQuery)
        .sort({ 
          [sortBy === 'date' ? 'createdAt' : 'name']: sortOrder === 'asc' ? 1 : -1 
        })
        .skip((page - 1) * limit)
        .limit(limit)
        .toArray()
      
      // Get total count
      const totalAlbums = await db.collection('albums').countDocuments(albumQuery)
      
      results.albums = albums
      results.totalAlbums = totalAlbums
    }
    
    // Search people
    if (type === 'people' || type === 'all') {
      let peopleQuery: any = {}
      
      // Text search in people names and descriptions using regex
      if (query) {
        const langs = SUPPORTED_LANGUAGES.map(l => l.code)
        const fields = ['firstName', 'lastName', 'fullName', 'nickname']
        peopleQuery.$or = fields.flatMap(f => langs.map(code => ({ [`${f}.${code}`]: { $regex: query, $options: 'i' } })))
      }
      
      // Get people with pagination
      const people = await PersonModel.find(peopleQuery)
        .sort({ 
          [sortBy === 'date' ? 'createdAt' : 'fullName']: sortOrder === 'asc' ? 1 : -1 
        })
        .skip((page - 1) * limit)
        .limit(limit)
        .lean()
      
      // Convert to consistent format
      const convertedPeople = people.map(person => {
        const firstName = typeof (person as any).firstName === 'string' 
          ? { en: (person as any).firstName, he: '' } 
          : (person as any).firstName
        
        const lastName = typeof (person as any).lastName === 'string' 
          ? { en: (person as any).lastName, he: '' } 
          : ((person as any).lastName || (person as any).familyName || { en: '', he: '' })
        
        // Generate fullName from firstName and lastName across languages
        const langCodes = SUPPORTED_LANGUAGES.map(l => l.code)
        const fullName = langCodes.reduce((acc: any, code: string) => {
          const fn = typeof firstName === 'object' ? (firstName as any)[code] || '' : ''
          const ln = typeof lastName === 'object' ? (lastName as any)[code] || '' : ''
          const combined = `${(fn || '').trim()} ${(ln || '').trim()}`.trim()
          if (combined) acc[code] = combined
          return acc
        }, {})
        
        return {
          ...person,
          firstName,
          lastName,
          fullName,
          nickname: typeof (person as any).nickname === 'string' 
            ? { en: (person as any).nickname, he: '' } 
            : ((person as any).nickname || {}),
          description: typeof (person as any).description === 'string' 
            ? { en: (person as any).description, he: '' } 
            : ((person as any).description || {})
        }
      })
      
      // Get total count
      const totalPeople = await PersonModel.countDocuments(peopleQuery)
      
      results.people = convertedPeople
      results.totalPeople = totalPeople
    }
    
    // Search locations
    if (type === 'locations' || type === 'all') {
      let locationQuery: any = {}
      
      // Text search in location names, descriptions, and addresses using regex
      if (query) {
        const langs = SUPPORTED_LANGUAGES.map(l => l.code)
        const nameDesc = ['name', 'description']
        const textConds = nameDesc.flatMap(f => langs.map(code => ({ [`${f}.${code}`]: { $regex: query, $options: 'i' } })))
        locationQuery.$or = [
          ...textConds,
          { address: { $regex: query, $options: 'i' } },
          { city: { $regex: query, $options: 'i' } },
          { state: { $regex: query, $options: 'i' } },
          { country: { $regex: query, $options: 'i' } }
        ]
      }
      
      // Get locations with pagination
      const locations = await LocationModel.find(locationQuery)
        .sort({ 
          [sortBy === 'date' ? 'createdAt' : 'name']: sortOrder === 'asc' ? 1 : -1 
        })
        .skip((page - 1) * limit)
        .limit(limit)
        .lean()
      
      // Get total count
      const totalLocations = await LocationModel.countDocuments(locationQuery)
      
      results.locations = locations
      results.totalLocations = totalLocations
    }
    
    // Check if there are more results
    const totalResults = results.totalPhotos + results.totalAlbums + results.totalPeople + results.totalLocations
    results.hasMore = totalResults > page * limit
    
    return NextResponse.json({
      success: true,
      data: results
    })
    
  } catch (error) {
    console.error('Search API error:', error)
    return NextResponse.json(
      { success: false, error: 'Search failed' },
      { status: 500 }
    )
  }
}
