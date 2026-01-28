import { connectToDatabase } from '@/lib/mongodb'
import { ObjectId } from 'mongodb'
import { QueryMonitor } from './query-monitor'
import { logger } from '@/lib/utils/logger'

export interface QueryOptimizationOptions {
  useAggregation?: boolean
  batchSize?: number
  projection?: Record<string, 1 | 0>
  sort?: Record<string, 1 | -1>
  limit?: number
  skip?: number
}

export interface BatchQueryResult<T> {
  data: T[]
  totalCount: number
  hasMore: boolean
  nextCursor?: string
}

export class DatabaseOptimizer {
  /**
   * Optimized album query with photos and metadata in single aggregation
   */
  static async getAlbumsWithMetadata(
    parentId?: string | null,
    options: QueryOptimizationOptions = {}
  ): Promise<any[]> {
    const endQuery = QueryMonitor.startQuery('getAlbumsWithMetadata')
    const { db } = await connectToDatabase()
    
    // First get the albums
    const matchStage: any = {}
    if (parentId === 'root' || parentId === null) {
      matchStage.parentAlbumId = null
    } else if (parentId) {
      matchStage.$or = [
        { parentAlbumId: new ObjectId(parentId) },
        { parentAlbumId: parentId }
      ]
    }

    const albums = await db.collection('albums')
      .find(matchStage)
      .sort({ level: 1, order: 1, name: 1 })
      .toArray()

    // Then get photo counts and cover photos for each album
    const albumsWithMetadata = await Promise.all(
      albums.map(async (album) => {
        // Get photo count using the same logic as the working photos API
        const photoCount = await db.collection('photos').countDocuments({
          $or: [
            { albumId: album._id },
            { albumId: album._id.toString() }
          ],
          isPublished: true
        })

        // Get cover photo
        const coverPhoto = await db.collection('photos')
          .findOne({
            $or: [
              { albumId: album._id },
              { albumId: album._id.toString() }
            ],
            isPublished: true
          }, {
            projection: { _id: 1, filename: 1, storage: 1, uploadedAt: 1 }
          })

        // Get child album count
        const childAlbumCount = await db.collection('albums').countDocuments({
          $or: [
            { parentAlbumId: album._id },
            { parentAlbumId: album._id.toString() }
          ],
          isPublic: true
        })

        return {
          ...album,
          photoCount,
          childAlbumCount,
          coverPhotoId: coverPhoto?._id,
          coverPhoto
        }
      })
    )

    try {
      endQuery(albumsWithMetadata.length, false)
      return albumsWithMetadata
    } catch (error) {
      endQuery(0, false, error instanceof Error ? error.message : 'Unknown error')
      throw error
    }
  }

  /**
   * Optimized photo query with album metadata
   */
  static async getPhotosWithAlbumData(
    albumId: string,
    options: QueryOptimizationOptions = {}
  ): Promise<any[]> {
    const { db } = await connectToDatabase()
    
    const pipeline: any[] = [
      {
        $match: {
          $or: [
            { albumId: new ObjectId(albumId) },
            { albumId: albumId }
          ],
          isPublished: true
        }
      },
      {
        $lookup: {
          from: 'albums',
          localField: 'albumId',
          foreignField: '_id',
          as: 'album',
          pipeline: [
            { $project: { name: 1, alias: 1, isPublic: 1 } }
          ]
        }
      },
      {
        $addFields: {
          albumName: { $arrayElemAt: ['$album.name', 0] },
          albumAlias: { $arrayElemAt: ['$album.alias', 0] }
        }
      },
      {
        $project: {
          _id: 1,
          title: 1,
          description: 1,
          filename: 1,
          originalFilename: 1,
          mimeType: 1,
          size: 1,
          dimensions: 1,
          storage: 1,
          tags: 1,
          exif: 1,
          albumName: 1,
          albumAlias: 1,
          uploadedAt: 1,
          updatedAt: 1
        }
      },
      { $sort: { uploadedAt: -1 } }
    ]

    if (options.limit) {
      pipeline.push({ $limit: options.limit })
    }

    if (options.skip) {
      pipeline.push({ $skip: options.skip })
    }

    return await db.collection('photos').aggregate(pipeline).toArray()
  }

  /**
   * Batch query for multiple albums with photos
   */
  static async getBatchAlbumsWithPhotos(
    albumIds: string[],
    options: QueryOptimizationOptions = {}
  ): Promise<Record<string, any>> {
    const { db } = await connectToDatabase()
    
    const objectIds = albumIds.map(id => new ObjectId(id))
    
    const pipeline: any[] = [
      {
        $match: {
          _id: { $in: objectIds }
        }
      },
      {
        $lookup: {
          from: 'photos',
          localField: '_id',
          foreignField: 'albumId',
          as: 'photos',
          pipeline: [
            { $match: { isPublished: true } },
            { $project: { _id: 1, filename: 1, storage: 1, uploadedAt: 1 } },
            { $sort: { uploadedAt: -1 } },
            { $limit: 5 } // Get top 5 photos for preview
          ]
        }
      },
      {
        $lookup: {
          from: 'photos',
          localField: '_id',
          foreignField: 'albumId',
          as: 'photoCount',
          pipeline: [
            { $match: { isPublished: true } },
            { $count: 'count' }
          ]
        }
      },
      {
        $addFields: {
          coverPhoto: { $arrayElemAt: ['$photos', 0] },
          photoCount: { $arrayElemAt: ['$photoCount.count', 0] }
        }
      },
      {
        $project: {
          _id: 1,
          name: 1,
          alias: 1,
          description: 1,
          isPublic: 1,
          coverPhoto: 1,
          photoCount: { $ifNull: ['$photoCount', 0] },
          photos: 1
        }
      }
    ]

    const results = await db.collection('albums').aggregate(pipeline).toArray()
    
    // Convert to key-value object for easy lookup
    const resultMap: Record<string, any> = {}
    results.forEach(album => {
      resultMap[album._id.toString()] = album
    })
    
    return resultMap
  }

  /**
   * Optimized search with full-text indexing
   */
  static async searchPhotos(
    query: string,
    filters: {
      albumId?: string
      tags?: ObjectId[]
      dateRange?: { start: Date; end: Date }
    } = {},
    options: QueryOptimizationOptions = {}
  ): Promise<any[]> {
    const { db } = await connectToDatabase()
    
    const matchStage: any = { isPublished: true }

    // Album filter
    if (filters.albumId) {
      matchStage.albumId = { $in: [new ObjectId(filters.albumId), filters.albumId] }
    }

    // Tags filter
    if (filters.tags && filters.tags.length > 0) {
      matchStage.tags = { $in: filters.tags }
    }

    // Date range filter
    if (filters.dateRange) {
      matchStage.uploadedAt = {
        $gte: filters.dateRange.start,
        $lte: filters.dateRange.end
      }
    }

    // Build language-aware conditions synchronously
    let textMatchAfterLookups: any | null = null
    if (query) {
      const { SUPPORTED_LANGUAGES } = await import('@/types/multi-lang')
      const langs = SUPPORTED_LANGUAGES.map(l => l.code)
      const titleDescConds = ['title', 'description']
        .flatMap(f => langs.map(code => ({ [`${f}.${code}`]: { $regex: query, $options: 'i' } })))
      const fileConds = [
        { filename: { $regex: query, $options: 'i' } },
        { originalFilename: { $regex: query, $options: 'i' } }
      ]
      // If photos store people as plain string names, match directly on array
      const peopleArrayRegex = { people: { $regex: query, $options: 'i' } } as any
      const peopleConds = ([] as any[]).concat(
        ...(['fullName', 'firstName', 'lastName', 'nickname'].map(f =>
          langs.map(code => ({ [`peopleDocs.${f}.${code}`]: { $regex: query, $options: 'i' } }))
        )),
        ['fullName', 'firstName', 'lastName', 'nickname'].map(f => ({ [`peopleDocs.${f}`]: { $regex: query, $options: 'i' } }))
      )
      textMatchAfterLookups = { $or: [ ...titleDescConds, ...fileConds, peopleArrayRegex, ...peopleConds ] }
    }

    const pipeline: any[] = [
      { $match: matchStage },
      {
        $lookup: {
          from: 'albums',
          localField: 'albumId',
          foreignField: '_id',
          as: 'album',
          pipeline: [
            { $project: { name: 1, alias: 1 } }
          ]
        }
      },
      // Normalize people to ObjectIds and join
      {
        $addFields: {
          peopleObjectIds: {
            $map: {
              input: { $ifNull: ['$people', []] },
              as: 'p',
              in: {
                $cond: [
                  { $eq: [ { $type: '$$p' }, 'objectId' ] },
                  '$$p',
                  {
                    $convert: { input: '$$p', to: 'objectId', onError: null, onNull: null }
                  }
                ]
              }
            }
          }
        }
      },
      {
        $lookup: {
          from: 'people',
          localField: 'peopleObjectIds',
          foreignField: '_id',
          as: 'peopleDocs',
          pipeline: [
            { $project: { fullName: 1, firstName: 1, lastName: 1, nickname: 1 } }
          ]
        }
      },
      ...(textMatchAfterLookups ? [{ $match: textMatchAfterLookups }] : []),
      {
        $addFields: {
          albumName: { $arrayElemAt: ['$album.name', 0] },
          albumAlias: { $arrayElemAt: ['$album.alias', 0] }
        }
      },
      { $sort: { uploadedAt: -1 } }
    ]

    if (options.limit) {
      pipeline.push({ $limit: options.limit })
    }

    if (options.skip) {
      pipeline.push({ $skip: options.skip })
    }

    return await db.collection('photos').aggregate(pipeline).toArray()
  }

  /**
   * Get paginated results with cursor-based pagination
   */
  static async getPaginatedResults<T>(
    collection: string,
    query: any = {},
    options: QueryOptimizationOptions & {
      cursor?: string
      sortField?: string
      sortDirection?: 1 | -1
    } = {}
  ): Promise<BatchQueryResult<T>> {
    const { db } = await connectToDatabase()
    
    const {
      cursor,
      sortField = '_id',
      sortDirection = -1,
      limit = 20,
      projection
    } = options

    let matchQuery = { ...query }
    
    // Add cursor-based pagination
    if (cursor) {
      const cursorValue = sortField === '_id' ? new ObjectId(cursor) : cursor
      matchQuery[sortField] = sortDirection === -1 
        ? { $lt: cursorValue }
        : { $gt: cursorValue }
    }

    const pipeline: any[] = [{ $match: matchQuery }]
    
    if (projection) {
      pipeline.push({ $project: projection })
    }
    
    pipeline.push({ $sort: { [sortField]: sortDirection } })
    pipeline.push({ $limit: limit + 1 }) // Get one extra to check if there are more

    const results = await db.collection(collection).aggregate(pipeline).toArray()
    
    const hasMore = results.length > limit
    const data = hasMore ? results.slice(0, limit) : results
    const nextCursor = hasMore && data.length > 0 
      ? data[data.length - 1][sortField].toString()
      : undefined

    return {
      data: data as T[],
      totalCount: data.length,
      hasMore,
      nextCursor
    }
  }

  /**
   * Create optimized indexes for common queries
   */
  static async createOptimizedIndexes(): Promise<void> {
    const { db } = await connectToDatabase()
    
    // Albums collection indexes
    await db.collection('albums').createIndexes([
      { key: { parentAlbumId: 1, order: 1 } },
      { key: { level: 1, isPublic: 1 } },
      { key: { isFeatured: 1, isPublic: 1 } },
      { key: { createdAt: -1 } },
      { key: { updatedAt: -1 } }
    ])

    // Photos collection indexes
    await db.collection('photos').createIndexes([
      { key: { albumId: 1, isPublished: 1 } },
      { key: { uploadedAt: -1, isPublished: 1 } },
      { key: { tags: 1, isPublished: 1 } },
      { key: { uploadedBy: 1 } },
      { key: { 'storage.provider': 1 } },
      { key: { title: 'text', description: 'text', tags: 'text' } } // Text search index
    ])

    // Blog articles indexes
    await db.collection('blogarticles').createIndexes([
      { key: { authorId: 1, isPublished: 1 } },
      { key: { category: 1, isPublished: 1 } },
      { key: { tags: 1, isPublished: 1 } },
      { key: { publishedAt: -1, isPublished: 1 } },
      { key: { title: 'text', content: 'text' } } // Text search index
    ])

    logger.info('✅ Optimized database indexes created successfully')
  }

  /**
   * Get database performance statistics
   */
  static async getPerformanceStats(): Promise<any> {
    const { db } = await connectToDatabase()
    
    const stats = await db.stats()
    const collections = await db.listCollections().toArray()
    
    const collectionStats = await Promise.all(
      collections.map(async (collection) => {
        try {
          const collStats = await (db.collection(collection.name) as any).stats()
          return {
            name: collection.name,
            count: collStats.count || 0,
            size: collStats.size || 0,
            avgObjSize: collStats.avgObjSize || 0,
            indexes: collStats.nindexes || 0,
            totalIndexSize: collStats.totalIndexSize || 0
          }
        } catch (error) {
          logger.warn(`Failed to get stats for collection ${collection.name}:`, error)
          return {
            name: collection.name,
            count: 0,
            size: 0,
            avgObjSize: 0,
            indexes: 0,
            totalIndexSize: 0
          }
        }
      })
    )

    return {
      database: {
        name: stats.db,
        collections: stats.collections,
        dataSize: stats.dataSize,
        storageSize: stats.storageSize,
        indexSize: stats.indexSize,
        totalSize: stats.dataSize + stats.indexSize
      },
      collections: collectionStats
    }
  }
}
