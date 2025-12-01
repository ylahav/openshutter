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
    const peopleIds = searchParams.get('people')?.split(',').filter(Boolean).map(id => new ObjectId(id)) || []
    const locationIds = searchParams.get('locationIds')?.split(',').filter(Boolean).map(id => new ObjectId(id)) || []
    const locationId = searchParams.get('locationId') // Keep for backward compatibility
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
        // Get all child album IDs recursively
        const getAllChildAlbumIds = async (parentId: string | ObjectId): Promise<ObjectId[]> => {
          const parentObjectId = typeof parentId === 'string' ? new ObjectId(parentId) : parentId
          const childAlbums = await db.collection('albums').find({
            $or: [
              { parentAlbumId: parentObjectId },
              { parentAlbumId: parentId.toString() }
            ]
          }).project({ _id: 1 }).toArray()
          
          let allIds: ObjectId[] = [parentObjectId]
          for (const child of childAlbums) {
            const childIds = await getAllChildAlbumIds(child._id)
            allIds = allIds.concat(childIds)
          }
          return allIds
        }
        
        const allAlbumIds = await getAllChildAlbumIds(albumId)
        const albumIdStrings = allAlbumIds.map(id => String(id))
        
        additionalFilters.push({
          $or: [
            { albumId: { $in: allAlbumIds } },
            { albumId: { $in: albumIdStrings } }
          ]
        })
      }
      
      if (peopleIds.length > 0) {
        // Handle both ObjectId and string formats for people field
        // The people field is an array, so $in checks if any of the IDs are in the array
        const peopleIdStrings = peopleIds.map(id => String(id))
        // Combine all possible ID formats into a single array for $in
        // This handles cases where people array contains ObjectIds, strings, or mixed types
        const allPeopleIds = [...peopleIds, ...peopleIdStrings]
        additionalFilters.push({
          people: { $in: allPeopleIds }
        })
      }
      
      // Handle location filters (support both single locationId and multiple locationIds)
      const finalLocationIds = locationIds.length > 0 ? locationIds : (locationId ? [new ObjectId(locationId)] : [])
      if (finalLocationIds.length > 0) {
        // Handle both ObjectId and string formats for location field
        const locationIdStrings = finalLocationIds.map(id => String(id))
        additionalFilters.push({
          $or: [
            { location: { $in: finalLocationIds } },
            { location: { $in: locationIdStrings } }
          ]
        })
      }
      
      if (dateFrom || dateTo) {
        const dateFilter: any = {}
        if (dateFrom) {
          // Parse date string and set to start of day in UTC to avoid timezone issues
          // dateFrom is in format "YYYY-MM-DD", parse it as UTC midnight
          const [year, month, day] = dateFrom.split('-').map(Number)
          const fromDate = new Date(Date.UTC(year, month - 1, day, 0, 0, 0, 0))
          dateFilter.$gte = fromDate
        }
        if (dateTo) {
          // Parse date string and set to end of day in UTC
          const [year, month, day] = dateTo.split('-').map(Number)
          const toDate = new Date(Date.UTC(year, month - 1, day, 23, 59, 59, 999))
          dateFilter.$lte = toDate
        }
        
        console.log('Date filter applied:', { 
          dateFrom, 
          dateTo, 
          dateFilter,
          fromDateISO: dateFilter.$gte ? dateFilter.$gte.toISOString() : undefined,
          toDateISO: dateFilter.$lte ? dateFilter.$lte.toISOString() : undefined
        })
        
        // Simplified date filter: match photos where ANY of these date fields fall within the range
        // Priority: exif.dateTime > exif.dateTimeOriginal > uploadedAt
        // This uses a simpler $or structure that MongoDB can optimize better
        additionalFilters.push({
          $or: [
            // Match if exif.dateTime exists and is in range
            { 'exif.dateTime': dateFilter },
            // Match if exif.dateTimeOriginal exists and is in range
            { 'exif.dateTimeOriginal': dateFilter },
            // Match if uploadedAt is in range (for photos without EXIF dates)
            { uploadedAt: dateFilter }
          ]
        })
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
          // Combine filters with $and if we have multiple conditions or if any filter uses $or/$and
          const hasComplexFilters = additionalFilters.some((f: any) => f.$or || f.$and)
          if (Object.keys(photoQuery).length > 1 || hasComplexFilters) {
            const baseQuery = { ...photoQuery }
            photoQuery = {
              $and: [baseQuery, ...additionalFilters]
            }
          } else {
            // Just merge the filters (only for simple field filters)
            Object.assign(photoQuery, ...additionalFilters)
          }
        }
      }
      
      // Debug: Test date filter separately and show sample photos with dates
      if (dateFrom || dateTo) {
        const dateFilter: any = {}
        if (dateFrom) {
          const [year, month, day] = dateFrom.split('-').map(Number)
          const fromDate = new Date(Date.UTC(year, month - 1, day, 0, 0, 0, 0))
          dateFilter.$gte = fromDate
        }
        if (dateTo) {
          const [year, month, day] = dateTo.split('-').map(Number)
          const toDate = new Date(Date.UTC(year, month - 1, day, 23, 59, 59, 999))
          dateFilter.$lte = toDate
        }
        const dateTestQuery = {
          isPublished: true,
          $or: [
            { 'exif.dateTime': dateFilter },
            { 'exif.dateTimeOriginal': dateFilter },
            { uploadedAt: dateFilter }
          ]
        }
        const dateTestCount = await db.collection('photos').countDocuments(dateTestQuery)
        console.log(`Date filter test (isPublished + date range): ${dateTestCount} photos`)
        
        // Also test without isPublished
        const dateTestQuery2 = {
          $or: [
            { 'exif.dateTime': dateFilter },
            { 'exif.dateTimeOriginal': dateFilter },
            { uploadedAt: dateFilter }
          ]
        }
        const dateTestCount2 = await db.collection('photos').countDocuments(dateTestQuery2)
        console.log(`Date filter test (date range only): ${dateTestCount2} photos`)
        
        // Get a few sample photos to see their actual dates
        const samplePhotos = await db.collection('photos')
          .find({ isPublished: true })
          .toArray()
        console.log('Sample photos with dates:', samplePhotos.map((p: any) => ({
          _id: String(p._id),
          uploadedAt: p.uploadedAt ? new Date(p.uploadedAt).toISOString() : null,
          exifDateTime: p.exif?.dateTime ? new Date(p.exif.dateTime).toISOString() : null,
          exifDateTimeOriginal: p.exif?.dateTimeOriginal ? new Date(p.exif.dateTimeOriginal).toISOString() : null,
          inRange: p.uploadedAt && dateFilter.$gte && dateFilter.$lte 
            ? (new Date(p.uploadedAt) >= dateFilter.$gte && new Date(p.uploadedAt) <= dateFilter.$lte)
            : false
        })))
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
      
      // Debug: Check a sample photo to see what date fields it has
      if (dateFrom || dateTo) {
        const samplePhoto = await db.collection('photos').findOne({ isPublished: true })
        if (samplePhoto) {
          console.log('Sample photo date fields:', {
            _id: String(samplePhoto._id),
            uploadedAt: samplePhoto.uploadedAt ? new Date(samplePhoto.uploadedAt).toISOString() : null,
            exifDateTime: samplePhoto.exif?.dateTime ? new Date(samplePhoto.exif.dateTime).toISOString() : null,
            exifDateTimeOriginal: samplePhoto.exif?.dateTimeOriginal ? new Date(samplePhoto.exif.dateTimeOriginal).toISOString() : null,
            hasExif: !!samplePhoto.exif
          })
        }
      }
      
      console.log(`Photo query results: found ${totalPhotos} photos, returning ${photos.length}`)
      console.log('Sample photo from query:', photos[0] ? {
        _id: String(photos[0]._id),
        hasPeople: Array.isArray(photos[0].people),
        peopleArray: photos[0].people?.map((p: any) => String(p)) || [],
        isPublished: photos[0].isPublished,
        hasStorage: !!photos[0].storage,
        thumbnailPath: photos[0].storage?.thumbnailPath,
        storageProvider: photos[0].storage?.provider
      } : 'No photos found')
      
      // Transform photos to ensure thumbnail URLs are properly constructed
      const transformedPhotos = photos.map((photo: any) => {
        if (photo.storage) {
          // Ensure thumbnailPath is a full URL
          if (photo.storage.thumbnailPath && !photo.storage.thumbnailPath.startsWith('/api/storage/serve/') && !photo.storage.thumbnailPath.startsWith('http')) {
            const provider = photo.storage.provider || 'local'
            photo.storage.thumbnailPath = `/api/storage/serve/${provider}/${encodeURIComponent(photo.storage.thumbnailPath)}`
          }
          // Ensure url is a full URL if it's not already
          if (photo.storage.url && !photo.storage.url.startsWith('/api/storage/serve/') && !photo.storage.url.startsWith('http')) {
            const provider = photo.storage.provider || 'local'
            photo.storage.url = `/api/storage/serve/${provider}/${encodeURIComponent(photo.storage.url)}`
          }
        }
        return photo
      })
      
      results.photos = transformedPhotos
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
