import { NextRequest, NextResponse } from 'next/server'
import { connectToDatabase, connectMongoose } from '@/lib/mongodb'
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
    
    // Ensure Mongoose is connected before using Mongoose models
    await connectMongoose()
    
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
    const isPublicParam = searchParams.get('isPublic')
    const isPublic = isPublicParam === '' || isPublicParam === null ? null : isPublicParam
    const mine = searchParams.get('mine') === 'true'
    
    console.log('Search API called with:', { 
      query, 
      type, 
      page, 
      limit, 
      sortBy, 
      sortOrder,
      isPublicParam,
      isPublic,
      fullUrl: request.url
    })
    
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
      let photoQuery: any = { isPublished: true }
      
      // If there's a search query, find matching people, tags, and locations first
      const matchingPersonIds: ObjectId[] = []
      const matchingTagIds: ObjectId[] = []
      const matchingLocationIds: ObjectId[] = []
      
      if (query && query.trim()) {
        
        // Search for matching people
        const langs = SUPPORTED_LANGUAGES.map(l => l.code)
        const personFields = ['firstName', 'lastName', 'fullName', 'nickname']
        
        // Build comprehensive person search conditions
        // 1. Multilingual field searches (e.g., lastName.en, lastName.he)
        // Use word boundary regex to match whole words or start of words
        const escapedQuery = query.replace(/[.*+?^${}()|[\]\\]/g, '\\$&') // Escape special regex chars
        const personConds = personFields.flatMap(f => langs.map(code => ({
          [`${f}.${code}`]: { $regex: escapedQuery, $options: 'i' }
        })))
        
        // 2. Direct string field searches (in case fields are stored as plain strings)
        const personStringConds = personFields.map(f => ({
          [f]: { $regex: escapedQuery, $options: 'i' }
        }))
        
        // 3. Also search in fullName as a combined field (e.g., "John Smith" should match "John" or "Smith")
        // But fullName might be an object, so we handle both cases
        const fullNameCombinedConds = [
          ...langs.map(code => ({ [`fullName.${code}`]: { $regex: escapedQuery, $options: 'i' } })),
          { fullName: { $regex: escapedQuery, $options: 'i' } }
        ]
        
        // 4. Search for query as part of fullName (handle cases where fullName is "FirstName LastName")
        // Split query and search for each word individually in fullName
        const queryWords = query.trim().split(/\s+/).filter(w => w.length > 0)
        const fullNameWordConds = queryWords.flatMap(word => {
          const escapedWord = word.replace(/[.*+?^${}()|[\]\\]/g, '\\$&')
          return [
            ...langs.map(code => ({ [`fullName.${code}`]: { $regex: escapedWord, $options: 'i' } })),
            { fullName: { $regex: escapedWord, $options: 'i' } }
          ]
        })
        
        // 5. Also search for partial matches at the start of names (e.g., "lio" should match "Lior")
        // This helps with shorter queries
        const partialMatchConds = personFields.flatMap(f => [
          ...langs.map(code => ({
            [`${f}.${code}`]: { $regex: `^${escapedQuery}`, $options: 'i' }
          })),
          {
            [f]: { $regex: `^${escapedQuery}`, $options: 'i' }
          }
        ])
        
        const allPersonConds = [
          ...personConds, 
          ...personStringConds, 
          ...fullNameCombinedConds, 
          ...fullNameWordConds,
          ...partialMatchConds
        ]
        
        const matchingPeople = await PersonModel.find({
          $or: allPersonConds
        }).select('_id firstName lastName fullName').lean()
        
        console.log('Person search for query:', query, {
          totalConditions: allPersonConds.length,
          foundPeople: matchingPeople.length,
          personIds: matchingPeople.map(p => String(p._id)),
          samplePerson: matchingPeople[0] ? {
            _id: String(matchingPeople[0]._id),
            firstName: matchingPeople[0].firstName,
            lastName: matchingPeople[0].lastName,
            fullName: matchingPeople[0].fullName
          } : null
        })
        
        matchingPersonIds.push(...matchingPeople.map(p => new ObjectId(String(p._id))))
        
        // Search for matching tags
        const tagConds = langs.map(code => ({ [`name.${code}`]: { $regex: query, $options: 'i' } }))
        const matchingTags = await TagModel.find({
          $or: [...tagConds, { name: { $regex: query, $options: 'i' } }]
        }).select('_id').lean()
        matchingTagIds.push(...matchingTags.map(t => new ObjectId(String(t._id))))
        
        // Search for matching locations
        const locationNameConds = langs.map(code => ({ [`name.${code}`]: { $regex: query, $options: 'i' } }))
        const matchingLocations = await LocationModel.find({
          $or: [
            ...locationNameConds,
            { name: { $regex: query, $options: 'i' } },
            { address: { $regex: query, $options: 'i' } },
            { city: { $regex: query, $options: 'i' } },
            { country: { $regex: query, $options: 'i' } }
          ]
        }).select('_id').lean()
        matchingLocationIds.push(...matchingLocations.map(l => new ObjectId(String(l._id))))
        
        // Build photo query: photos that reference matching people/tags/locations OR match text in their own fields
        const photoOrConditions: any[] = []
        
        if (matchingPersonIds.length > 0) {
          // people field is an array of ObjectIds in MongoDB
          // Try multiple matching strategies to handle different storage formats
          const personIdStrings = matchingPersonIds.map(id => String(id))
          
          // Strategy 1: Match ObjectIds directly
          photoOrConditions.push({ people: { $in: matchingPersonIds } })
          
          // Strategy 2: Match as strings (in case stored as strings)
          photoOrConditions.push({ people: { $in: personIdStrings } })
          
          // Strategy 3: Match each person ID individually (handles mixed ObjectId/string storage)
          matchingPersonIds.forEach(personId => {
            photoOrConditions.push({ people: personId })
            photoOrConditions.push({ people: String(personId) })
            // Also try as ObjectId in case it's stored differently
            try {
              const objId = new ObjectId(String(personId))
              photoOrConditions.push({ people: objId })
            } catch (e) {
              // Ignore ObjectId conversion errors
            }
          })
          
          console.log('Photo person matching conditions:', {
            personIds: matchingPersonIds.map(id => String(id)),
            personIdStrings,
            totalConditions: photoOrConditions.length
          })
        }
        if (matchingTagIds.length > 0) {
          const tagIdStrings = matchingTagIds.map(id => String(id))
          photoOrConditions.push({ tags: { $in: matchingTagIds } })
          photoOrConditions.push({ tags: { $in: tagIdStrings } })
        }
        if (matchingLocationIds.length > 0) {
          // Location is a single ObjectId, not an array
          const locationIdStrings = matchingLocationIds.map(id => String(id))
          photoOrConditions.push({ location: { $in: matchingLocationIds } })
          photoOrConditions.push({ location: { $in: locationIdStrings } })
          matchingLocationIds.forEach(id => {
            photoOrConditions.push({ location: id })
            photoOrConditions.push({ location: String(id) })
          })
        }
        
        // Also search in photo's own text fields
        const photoTextConds = langs.map(code => [
          { [`title.${code}`]: { $regex: query, $options: 'i' } },
          { [`description.${code}`]: { $regex: query, $options: 'i' } }
        ]).flat()
        photoTextConds.push(
          { title: { $regex: query, $options: 'i' } },
          { description: { $regex: query, $options: 'i' } },
          { filename: { $regex: query, $options: 'i' } },
          { originalFilename: { $regex: query, $options: 'i' } }
        )
        photoOrConditions.push(...photoTextConds)
        
        if (photoOrConditions.length > 0) {
          // When combining isPublished with $or, we need to use $and to ensure both conditions are met
          // MongoDB requires explicit $and when mixing simple conditions with $or
          photoQuery = {
            $and: [
              { isPublished: true },
              { $or: photoOrConditions }
            ]
          }
          console.log('Built $and query with OR conditions:', {
            andCount: photoQuery.$and.length,
            orConditionsCount: photoOrConditions.length,
            firstOrCondition: photoOrConditions[0]
          })
        } else {
          // No search conditions, just keep isPublished: true
          console.log('No OR conditions, keeping simple isPublished query')
        }
        
        console.log('Photo search by reference:', {
          query,
          matchingPersonIds: matchingPersonIds.map(id => String(id)),
          matchingPersonIdsCount: matchingPersonIds.length,
          matchingTagIds: matchingTagIds.map(id => String(id)),
          matchingTagIdsCount: matchingTagIds.length,
          matchingLocationIds: matchingLocationIds.map(id => String(id)),
          matchingLocationIdsCount: matchingLocationIds.length,
          photoOrConditionsCount: photoOrConditions.length,
          photoQuery: JSON.stringify(photoQuery, null, 2)
        })
      }
      
      // Apply additional filters
      // If photoQuery has $and structure, add filters to the $and array
      // Otherwise, add them directly
      const additionalFilters: any[] = []
      
      if (tagIds.length > 0) {
        additionalFilters.push({ tags: { $in: tagIds } })
      }
      
      if (albumId) {
        additionalFilters.push({ albumId: { $in: [new ObjectId(albumId), albumId] } })
      }
      
      if (dateFrom || dateTo) {
        const dateFilter: any = {}
        if (dateFrom) dateFilter.$gte = new Date(dateFrom)
        if (dateTo) dateFilter.$lte = new Date(dateTo)
        additionalFilters.push({ uploadedAt: dateFilter })
      }
      
      if (storageProvider) {
        additionalFilters.push({ 'storage.provider': storageProvider })
      }
      
      if (isPublic !== null) {
        // Override isPublished if explicitly set
        if (photoQuery.$and) {
          // Replace isPublished in $and array
          photoQuery.$and = photoQuery.$and.filter((cond: any) => !cond.isPublished)
          additionalFilters.push({ isPublished: isPublic === 'true' })
        } else {
          photoQuery.isPublished = isPublic === 'true'
        }
      }
      
      if (mine && user) {
        additionalFilters.push({ uploadedBy: { $in: [new ObjectId(user.id), user.id] } })
      }
      
      // Add additional filters to query
      if (additionalFilters.length > 0) {
        if (photoQuery.$and) {
          photoQuery.$and.push(...additionalFilters)
        } else {
          // Combine filters with $and if we have multiple conditions
          if (Object.keys(photoQuery).length > 1) {
            const baseQuery = { ...photoQuery }
            photoQuery = {
              $and: [baseQuery, ...additionalFilters]
            }
          } else {
            // Just merge the filters
            Object.assign(photoQuery, ...additionalFilters)
          }
        }
      }
      
      // Debug: Check what photos exist with matching person IDs (before applying full query)
      if (matchingPersonIds && matchingPersonIds.length > 0) {
        const testQuerySimple = { people: { $in: matchingPersonIds } }
        const testCountSimple = await db.collection('photos').countDocuments(testQuerySimple)
        const testPhotosSimple = await db.collection('photos')
          .find(testQuerySimple)
          .limit(3)
          .toArray()
        
        console.log('Debug: Photos with matching person IDs (simple query):', {
          personIds: matchingPersonIds.map((id: any) => String(id)),
          testCountSimple,
          samplePhotos: testPhotosSimple.map((p: any) => ({
            _id: String(p._id),
            isPublished: p.isPublished,
            people: p.people?.map((pid: any) => ({
              value: String(pid),
              type: typeof pid,
              isObjectId: pid instanceof ObjectId || (typeof pid === 'object' && pid.constructor?.name === 'ObjectId')
            })) || []
          }))
        })
      }

      // Debug: Log the final query
      console.log('Final photo query:', JSON.stringify(photoQuery, null, 2))
      console.log('Photo query type check:', {
        isPublishedType: typeof photoQuery.isPublished,
        hasOr: !!photoQuery.$or,
        hasAnd: !!photoQuery.$and,
        orConditionsCount: photoQuery.$or?.length || 0,
        andConditionsCount: photoQuery.$and?.length || 0
      })
      
      // Get photos with pagination
      const photos = await db.collection('photos')
        .find(photoQuery)
        .sort({ 
          [sortBy === 'date' ? 'uploadedAt' : sortBy === 'filename' ? 'filename' : 'uploadedAt']: sortOrder === 'asc' ? 1 : -1 
        })
        .skip((page - 1) * limit)
        .limit(limit)
        .toArray()
      
      // Get total count
      const totalPhotos = await db.collection('photos').countDocuments(photoQuery)
      
      console.log(`Photo query results: found ${totalPhotos} photos, returning ${photos.length}`)
      console.log('Sample photo from query:', photos[0] ? {
        _id: String(photos[0]._id),
        hasPeople: Array.isArray(photos[0].people),
        peopleArray: photos[0].people?.map((p: any) => String(p)) || [],
        isPublished: photos[0].isPublished
      } : 'No photos found')
      
      results.photos = photos
      results.totalPhotos = totalPhotos
    }
    
    // Search albums
    if (type === 'albums' || type === 'all') {
      let albumQuery: any = {}
      
      // If there's a search query, find matching tags first (albums can reference tags)
      if (query && query.trim()) {
        const matchingTagIds: ObjectId[] = []
        
        // Search for matching tags
        const langs = SUPPORTED_LANGUAGES.map(l => l.code)
        const tagConds = langs.map(code => ({ [`name.${code}`]: { $regex: query, $options: 'i' } }))
        const matchingTags = await TagModel.find({
          $or: [...tagConds, { name: { $regex: query, $options: 'i' } }]
        }).select('_id').lean()
        matchingTagIds.push(...matchingTags.map(t => new ObjectId(String(t._id))))
        
        // Build album query: albums that reference matching tags OR match text in their own fields
        const albumOrConditions: any[] = []
        
        if (matchingTagIds.length > 0) {
          albumOrConditions.push({ tags: { $in: matchingTagIds } })
        }
        
        // Also search in album's own text fields
        const albumTextConds = [
          { name: { $regex: query, $options: 'i' } },
          { description: { $regex: query, $options: 'i' } },
          { alias: { $regex: query, $options: 'i' } }
        ]
        albumOrConditions.push(...albumTextConds)
        
        if (albumOrConditions.length > 0) {
          albumQuery.$or = albumOrConditions
        }
        
        console.log('Album search by reference:', {
          matchingTagIds: matchingTagIds.length,
          albumOrConditionsCount: albumOrConditions.length
        })
      }
      
      // Apply filters
      if (tagIds.length > 0) {
        if (albumQuery.tags) {
          albumQuery.tags = { $in: [...tagIds, ...(Array.isArray(albumQuery.tags.$in) ? albumQuery.tags.$in : [])] }
        } else {
          albumQuery.tags = { $in: tagIds }
        }
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
          if (albumQuery.$or) {
            albumQuery.$and = [
              { $or: albumQuery.$or },
              { $or: [{ createdBy: user.id }, { createdBy: userObjectId }] }
            ]
            delete albumQuery.$or
          } else {
            albumQuery.$or = [
              { createdBy: user.id },
              { createdBy: userObjectId }
            ]
          }
        } catch {
          if (albumQuery.$or) {
            albumQuery.$and = [
              { $or: albumQuery.$or },
              { createdBy: user.id }
            ]
            delete albumQuery.$or
          } else {
            albumQuery.createdBy = user.id
          }
        }
      }
      
      // Apply access control for non-admin users
      if (user?.role !== 'admin') {
        const accessQuery = await buildAlbumAccessQuery(user)
        if (albumQuery.$and) {
          albumQuery.$and.push(accessQuery)
        } else {
          albumQuery = { $and: [albumQuery, accessQuery] }
        }
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
      
      // Text search in people names using regex (supports both multilingual objects and plain strings)
      if (query) {
        const langs = SUPPORTED_LANGUAGES.map(l => l.code)
        const fields = ['firstName', 'lastName', 'fullName', 'nickname']
        const multilingualConds = fields.flatMap(f => langs.map(code => ({ [`${f}.${code}`]: { $regex: query, $options: 'i' } })))
        const stringConds = fields.map(f => ({ [f]: { $regex: query, $options: 'i' } }))
        const descConds = langs.map(code => ({ [`description.${code}`]: { $regex: query, $options: 'i' } }))
        const descString = { description: { $regex: query, $options: 'i' } }
        peopleQuery.$or = [...multilingualConds, ...stringConds, ...descConds, descString]
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
      
      console.log('People search results:', { 
        queryCount: convertedPeople.length, 
        totalPeople,
        samplePerson: convertedPeople[0] 
      })
      
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
    
    console.log('Search API returning:', {
      totalPhotos: results.totalPhotos,
      totalAlbums: results.totalAlbums,
      totalPeople: results.totalPeople,
      totalLocations: results.totalLocations,
      totalResults
    })
    
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
