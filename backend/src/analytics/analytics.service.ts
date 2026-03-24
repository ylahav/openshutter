import { Injectable, Logger } from '@nestjs/common';
import { connectDB } from '../config/db';
import mongoose, { Types } from 'mongoose';

export interface DateRange {
  dateFrom?: Date;
  dateTo?: Date;
}

export interface ViewsAnalytics {
  summary: {
    total: number;
    unique: number;
    photos: number;
    albums: number;
  };
  trends: Array<{
    date: string;
    views: number;
    unique: number;
  }>;
  topResources: Array<{
    _id: string;
    name: string;
    views: number;
    uniqueViews: number;
  }>;
}

export interface SearchAnalytics {
  summary: {
    totalSearches: number;
    uniqueQueries: number;
    averageResults: number;
  };
  popularQueries: Array<{
    query: string;
    count: number;
    averageResults: number;
    lastSearched: string;
  }>;
  byType: {
    photos: number;
    albums: number;
    people: number;
    locations: number;
  };
  trends: Array<{
    date: string;
    searches: number;
  }>;
  /** How visitors use tag filters in search (from analytics_events). */
  tagFilterStats: {
    summary: {
      searchesWithTagFilter: number;
      shareOfSearchesPercent: number;
      zeroResultWithTagFilter: number;
      averageResultsWhenTagFilter: number;
    };
    topFilterTags: Array<{
      tagId: string;
      name: string;
      filterUses: number;
      zeroResultCount: number;
      averageResults: number;
    }>;
  };
}

@Injectable()
export class AnalyticsService {
  private readonly logger = new Logger(AnalyticsService.name);

  /**
   * Get views analytics
   */
  async getViewsAnalytics(
    dateRange?: DateRange,
    period: 'day' | 'week' | 'month' = 'day',
    type?: 'photo' | 'album' | 'all',
    resourceId?: string
  ): Promise<ViewsAnalytics> {
    await connectDB();
    const db = mongoose.connection.db;
    if (!db) {
      throw new Error('Database connection not established');
    }

    const dateFrom = dateRange?.dateFrom || new Date(Date.now() - 30 * 24 * 60 * 60 * 1000); // Default: 30 days ago
    const dateTo = dateRange?.dateTo || new Date();

    // Build match filter
    const matchFilter: any = {
      timestamp: { $gte: dateFrom, $lte: dateTo },
    };

    if (type === 'photo') {
      matchFilter.type = 'photo_view';
    } else if (type === 'album') {
      matchFilter.type = 'album_view';
    } else {
      matchFilter.type = { $in: ['photo_view', 'album_view'] };
    }

    if (resourceId) {
      matchFilter.resourceId = resourceId;
    }

    // Check if collection exists, if not return empty results
    const collections = await db.listCollections({ name: 'analytics_events' }).toArray();
    if (collections.length === 0) {
      // Collection doesn't exist yet - return empty results
      return {
        summary: {
          total: 0,
          unique: 0,
          photos: 0,
          albums: 0,
        },
        trends: [],
        topResources: [],
      };
    }

    // Get summary
    const [totalViews, uniqueUsers, photoViews, albumViews] = await Promise.all([
      db.collection('analytics_events').countDocuments(matchFilter).catch(() => 0),
      db.collection('analytics_events').distinct('userId', { ...matchFilter, userId: { $exists: true, $ne: null } }).catch(() => []),
      db.collection('analytics_events').countDocuments({ ...matchFilter, type: 'photo_view' }).catch(() => 0),
      db.collection('analytics_events').countDocuments({ ...matchFilter, type: 'album_view' }).catch(() => 0),
    ]);

    // Group by date period
    const groupFormat: Record<string, string> = {
      day: '%Y-%m-%d',
      week: '%Y-W%V',
      month: '%Y-%m',
    };

    let trends: any[] = [];
    try {
      trends = await db.collection('analytics_events').aggregate([
        { $match: matchFilter },
        {
          $group: {
            _id: {
              date: { $dateToString: { format: groupFormat[period], date: '$timestamp' } },
            },
            views: { $sum: 1 },
            uniqueUsers: { $addToSet: '$userId' },
          },
        },
        {
          $project: {
            _id: 1,
            views: 1,
            unique: {
              $size: {
                $filter: {
                  input: '$uniqueUsers',
                  as: 'user',
                  cond: { $ne: ['$$user', null] },
                },
              },
            },
          },
        },
        { $sort: { _id: 1 } },
      ]).toArray();
    } catch (error) {
      this.logger.warn(`Error aggregating trends: ${error instanceof Error ? error.message : String(error)}`);
      trends = [];
    }

    // Get top resources
    let topResources: any[] = [];
    try {
      topResources = await db.collection('analytics_events').aggregate([
        { $match: { ...matchFilter, resourceId: { $exists: true, $ne: null } } },
        {
          $group: {
            _id: '$resourceId',
            views: { $sum: 1 },
            uniqueViews: { $addToSet: '$userId' },
          },
        },
        {
          $project: {
            _id: 1,
            views: 1,
            uniqueViews: { $size: '$uniqueViews' },
          },
        },
        { $sort: { views: -1 } },
        { $limit: 20 },
      ]).toArray();
    } catch (error) {
      this.logger.warn(`Error aggregating top resources: ${error instanceof Error ? error.message : String(error)}`);
      topResources = [];
    }

    // Get resource names
    const resourceIds = topResources.map((r) => r._id).filter(Boolean);
    let photos: any[] = [];
    let albums: any[] = [];
    
    if (resourceIds.length > 0) {
      try {
        // Try to convert IDs to ObjectIds and fetch
        const objectIds = resourceIds
          .map((id) => {
            try {
              return new mongoose.Types.ObjectId(id);
            } catch {
              return null;
            }
          })
          .filter((id) => id !== null);

        if (objectIds.length > 0) {
          [photos, albums] = await Promise.all([
            db.collection('photos')
              .find({ _id: { $in: objectIds } })
              .project({ _id: 1, title: 1, filename: 1 })
              .toArray()
              .catch(() => []),
            db.collection('albums')
              .find({ _id: { $in: objectIds } })
              .project({ _id: 1, name: 1, alias: 1 })
              .toArray()
              .catch(() => []),
          ]);
        }
      } catch (error) {
        this.logger.warn(`Error fetching resource names: ${error instanceof Error ? error.message : String(error)}`);
      }
    }

    const resourceMap = new Map();
    photos.forEach((p) => {
      const name = typeof p.title === 'string' ? p.title : p.title?.en || p.filename || 'Untitled';
      resourceMap.set(p._id.toString(), name);
    });
    albums.forEach((a) => {
      const name = typeof a.name === 'string' ? a.name : a.name?.en || a.alias || 'Untitled';
      resourceMap.set(a._id.toString(), name);
    });

    return {
      summary: {
        total: totalViews || 0,
        unique: Array.isArray(uniqueUsers) ? uniqueUsers.length : 0,
        photos: photoViews || 0,
        albums: albumViews || 0,
      },
      trends: trends.map((t) => ({
        date: t._id || '',
        views: t.views || 0,
        unique: t.unique || 0,
      })),
      topResources: topResources
        .filter((r) => r._id)
        .map((r) => ({
          _id: r._id?.toString() || '',
          name: resourceMap.get(r._id?.toString()) || 'Unknown',
          views: r.views || 0,
          uniqueViews: r.uniqueViews || 0,
        })),
    };
  }

  /**
   * Get search analytics
   */
  async getSearchAnalytics(
    dateRange?: DateRange,
    limit: number = 20
  ): Promise<SearchAnalytics> {
    await connectDB();
    const db = mongoose.connection.db;
    if (!db) {
      throw new Error('Database connection not established');
    }

    // Check if collection exists
    const collections = await db.listCollections({ name: 'analytics_events' }).toArray();
    if (collections.length === 0) {
      return {
        summary: {
          totalSearches: 0,
          uniqueQueries: 0,
          averageResults: 0,
        },
        popularQueries: [],
        byType: {
          photos: 0,
          albums: 0,
          people: 0,
          locations: 0,
        },
        trends: [],
        tagFilterStats: {
          summary: {
            searchesWithTagFilter: 0,
            shareOfSearchesPercent: 0,
            zeroResultWithTagFilter: 0,
            averageResultsWhenTagFilter: 0,
          },
          topFilterTags: [],
        },
      };
    }

    const dateFrom = dateRange?.dateFrom || new Date(Date.now() - 30 * 24 * 60 * 60 * 1000);
    const dateTo = dateRange?.dateTo || new Date();

    const matchFilter = {
      type: 'search',
      timestamp: { $gte: dateFrom, $lte: dateTo },
    };

    // Get summary
    const [totalSearches, uniqueQueries, searchesWithResults] = await Promise.all([
      db.collection('analytics_events').countDocuments(matchFilter).catch(() => 0),
      db.collection('analytics_events').distinct('metadata.query', { ...matchFilter, 'metadata.query': { $exists: true, $ne: '' } }).catch(() => []),
      db.collection('analytics_events')
        .aggregate([
          { $match: { ...matchFilter, 'metadata.resultCount': { $exists: true } } },
          { $group: { _id: null, total: { $sum: '$metadata.resultCount' }, count: { $sum: 1 } } },
        ])
        .toArray()
        .catch(() => []),
    ]);

    const averageResults = searchesWithResults.length > 0 && searchesWithResults[0].count > 0
      ? searchesWithResults[0].total / searchesWithResults[0].count
      : 0;

    const totalSearchesNum = totalSearches || 0;

    // Popular queries
    let popularQueries: any[] = [];
    try {
      popularQueries = await db.collection('analytics_events').aggregate([
        { $match: { ...matchFilter, 'metadata.query': { $exists: true, $ne: '' } } },
        {
          $group: {
            _id: '$metadata.query',
            count: { $sum: 1 },
            averageResults: { $avg: '$metadata.resultCount' },
            lastSearched: { $max: '$timestamp' },
          },
        },
        { $sort: { count: -1 } },
        { $limit: limit },
      ]).toArray();
    } catch (error) {
      this.logger.warn(`Error aggregating popular queries: ${error instanceof Error ? error.message : String(error)}`);
      popularQueries = [];
    }

    // By type
    let byType: any[] = [];
    try {
      byType = await db.collection('analytics_events').aggregate([
        { $match: matchFilter },
        {
          $group: {
            _id: '$metadata.searchType',
            count: { $sum: 1 },
          },
        },
      ]).toArray();
    } catch (error) {
      this.logger.warn(`Error aggregating by type: ${error instanceof Error ? error.message : String(error)}`);
      byType = [];
    }

    const byTypeMap = new Map(byType.map((b) => [b._id || 'photos', b.count]));

    // Trends (daily)
    let trends: any[] = [];
    try {
      trends = await db.collection('analytics_events').aggregate([
        { $match: matchFilter },
        {
          $group: {
            _id: { $dateToString: { format: '%Y-%m-%d', date: '$timestamp' } },
            searches: { $sum: 1 },
          },
        },
        { $sort: { _id: 1 } },
      ]).toArray();
    } catch (error) {
      this.logger.warn(`Error aggregating search trends: ${error instanceof Error ? error.message : String(error)}`);
      trends = [];
    }

    const tagFilterStats = await this.buildSearchTagFilterStats(db, matchFilter, totalSearchesNum, limit);

    return {
      summary: {
        totalSearches: totalSearchesNum,
        uniqueQueries: Array.isArray(uniqueQueries) ? uniqueQueries.length : 0,
        averageResults: Math.round(averageResults * 100) / 100,
      },
      popularQueries: popularQueries.map((q) => ({
        query: q._id || '',
        count: q.count || 0,
        averageResults: Math.round((q.averageResults || 0) * 100) / 100,
        lastSearched: q.lastSearched?.toISOString() || new Date().toISOString(),
      })),
      byType: {
        photos: byTypeMap.get('photos') || 0,
        albums: byTypeMap.get('albums') || 0,
        people: byTypeMap.get('people') || 0,
        locations: byTypeMap.get('locations') || 0,
      },
      trends: trends.map((t) => ({
        date: t._id || '',
        searches: t.searches || 0,
      })),
      tagFilterStats,
    };
  }

  /**
   * Search + tag-filter behavior scoped to one gallery owner (logged-in searches as that user, or anonymous/API on their custom domain).
   */
  async getOwnerSearchTagFilterStats(
    ownerId: string,
    dateRange?: DateRange,
    limit: number = 20,
  ): Promise<{
    summary: { totalSearches: number };
    tagFilterStats: SearchAnalytics['tagFilterStats'];
  }> {
    await connectDB();
    const db = mongoose.connection.db;
    if (!db) {
      throw new Error('Database connection not established');
    }

    const collections = await db.listCollections({ name: 'analytics_events' }).toArray();
    if (collections.length === 0) {
      return {
        summary: { totalSearches: 0 },
        tagFilterStats: {
          summary: {
            searchesWithTagFilter: 0,
            shareOfSearchesPercent: 0,
            zeroResultWithTagFilter: 0,
            averageResultsWhenTagFilter: 0,
          },
          topFilterTags: [],
        },
      };
    }

    const dateFrom = dateRange?.dateFrom || new Date(Date.now() - 30 * 24 * 60 * 60 * 1000);
    const dateTo = dateRange?.dateTo || new Date();

    const ownerSearchMatch: Record<string, unknown> = {
      type: 'search',
      timestamp: { $gte: dateFrom, $lte: dateTo },
      $or: [{ userId: ownerId }, { 'metadata.ownerScopeId': ownerId }],
    };

    const totalSearches = await db.collection('analytics_events').countDocuments(ownerSearchMatch);
    const tagFilterStats = await this.buildSearchTagFilterStats(db, ownerSearchMatch, totalSearches, limit);

    return {
      summary: { totalSearches },
      tagFilterStats,
    };
  }

  private async buildSearchTagFilterStats(
    db: mongoose.mongo.Db,
    searchMatch: Record<string, unknown>,
    totalSearches: number,
    limit: number,
  ): Promise<SearchAnalytics['tagFilterStats']> {
    const tagFilterMatch = {
      ...searchMatch,
      'metadata.filters.tags.0': { $exists: true },
    };

    let searchesWithTagFilter = 0;
    let zeroResultWithTagFilter = 0;
    let avgWhenTagFilter = 0;
    let topFilterTagRows: Array<{
      _id: string;
      filterUses: number;
      zeroResultCount: number;
      averageResults: number;
    }> = [];

    try {
      const [withTagCount, zeroTagCount, avgRows, topRows] = await Promise.all([
        db.collection('analytics_events').countDocuments(tagFilterMatch),
        db.collection('analytics_events').countDocuments({
          ...tagFilterMatch,
          'metadata.resultCount': 0,
        }),
        db
          .collection('analytics_events')
          .aggregate([
            { $match: tagFilterMatch },
            { $group: { _id: null, avg: { $avg: '$metadata.resultCount' } } },
          ])
          .toArray(),
        db
          .collection('analytics_events')
          .aggregate([
            { $match: tagFilterMatch },
            { $unwind: '$metadata.filters.tags' },
            {
              $group: {
                _id: '$metadata.filters.tags',
                filterUses: { $sum: 1 },
                zeroResultCount: {
                  $sum: {
                    $cond: [{ $eq: ['$metadata.resultCount', 0] }, 1, 0],
                  },
                },
                totalResults: { $sum: '$metadata.resultCount' },
              },
            },
            { $sort: { filterUses: -1 } },
            { $limit: limit },
          ])
          .toArray(),
      ]);

      searchesWithTagFilter = withTagCount || 0;
      zeroResultWithTagFilter = zeroTagCount || 0;
      avgWhenTagFilter =
        avgRows.length > 0 && typeof avgRows[0].avg === 'number'
          ? Math.round(avgRows[0].avg * 100) / 100
          : 0;

      topFilterTagRows = topRows.map((r) => ({
        _id: String(r._id ?? ''),
        filterUses: r.filterUses || 0,
        zeroResultCount: r.zeroResultCount || 0,
        averageResults:
          r.filterUses > 0
            ? Math.round(((r.totalResults || 0) / r.filterUses) * 100) / 100
            : 0,
      }));
    } catch (error) {
      this.logger.warn(
        `Error aggregating search tag-filter stats: ${error instanceof Error ? error.message : String(error)}`,
      );
    }

    const totalSearchesNum = totalSearches || 0;
    const shareOfSearchesPercent =
      totalSearchesNum > 0
        ? Math.round((searchesWithTagFilter / totalSearchesNum) * 10000) / 100
        : 0;

    const tagIdsForNames = topFilterTagRows
      .map((r) => r._id)
      .filter((id) => Types.ObjectId.isValid(id));
    const tagNameById = new Map<string, string>();
    if (tagIdsForNames.length > 0) {
      try {
        const objectIds = tagIdsForNames.map((id) => new Types.ObjectId(id));
        const tagDocs = await db
          .collection('tags')
          .find({ _id: { $in: objectIds } }, { projection: { name: 1 } })
          .toArray();
        for (const doc of tagDocs) {
          const id = doc._id?.toString();
          if (id) {
            tagNameById.set(id, AnalyticsService.formatTagName(doc.name));
          }
        }
      } catch (error) {
        this.logger.warn(
          `Error resolving tag names for search analytics: ${error instanceof Error ? error.message : String(error)}`,
        );
      }
    }

    const topFilterTags = topFilterTagRows.map((r) => ({
      tagId: r._id,
      name: tagNameById.get(r._id) || r._id,
      filterUses: r.filterUses,
      zeroResultCount: r.zeroResultCount,
      averageResults: r.averageResults,
    }));

    return {
      summary: {
        searchesWithTagFilter,
        shareOfSearchesPercent,
        zeroResultWithTagFilter,
        averageResultsWhenTagFilter: avgWhenTagFilter,
      },
      topFilterTags,
    };
  }

  private static formatTagName(name: unknown): string {
    if (typeof name === 'string') {
      return name;
    }
    if (name && typeof name === 'object') {
      const o = name as Record<string, string>;
      return o.en || o.he || Object.values(o)[0] || '';
    }
    return '';
  }

  /**
   * Get tag usage trends
   */
  async getTagUsageTrends(
    dateRange?: DateRange,
    period: 'day' | 'week' | 'month' = 'day'
  ): Promise<any> {
    await connectDB();
    const db = mongoose.connection.db;
    if (!db) {
      throw new Error('Database connection not established');
    }

    const dateFrom = dateRange?.dateFrom || new Date(Date.now() - 30 * 24 * 60 * 60 * 1000);
    const dateTo = dateRange?.dateTo || new Date();
    
    // Check if collections exist
    const collections = await db.listCollections().toArray();
    const hasTags = collections.some((c) => c.name === 'tags');
    const hasPhotos = collections.some((c) => c.name === 'photos');
    
    if (!hasTags || !hasPhotos) {
      return {
        tagsCreated: [],
        tagsUsed: [],
        topTags: [],
      };
    }

    const groupFormat: Record<string, string> = {
      day: '%Y-%m-%d',
      week: '%Y-W%V',
      month: '%Y-%m',
    };

    // Tag creation trends
    let tagsCreated: any[] = [];
    try {
      tagsCreated = await db.collection('tags').aggregate([
        {
          $match: {
            createdAt: { $gte: dateFrom, $lte: dateTo },
          },
        },
        {
          $group: {
            _id: { $dateToString: { format: groupFormat[period], date: '$createdAt' } },
            count: { $sum: 1 },
          },
        },
        { $sort: { _id: 1 } },
      ]).toArray();
    } catch (error) {
      this.logger.warn(`Error aggregating tag creation trends: ${error instanceof Error ? error.message : String(error)}`);
      tagsCreated = [];
    }

    // Tag usage trends (from photos)
    let tagUsage: any[] = [];
    try {
      tagUsage = await db.collection('photos').aggregate([
        {
          $match: {
            updatedAt: { $gte: dateFrom, $lte: dateTo },
            tags: { $exists: true, $ne: [] },
          },
        },
        {
          $unwind: '$tags',
        },
        {
          $group: {
            _id: {
              date: { $dateToString: { format: groupFormat[period], date: '$updatedAt' } },
              tagId: '$tags',
            },
            count: { $sum: 1 },
          },
        },
        {
          $group: {
            _id: '$_id.date',
            tagsUsed: { $sum: 1 },
            totalUsage: { $sum: '$count' },
          },
        },
        { $sort: { _id: 1 } },
      ]).toArray();
    } catch (error) {
      this.logger.warn(`Error aggregating tag usage trends: ${error instanceof Error ? error.message : String(error)}`);
      tagUsage = [];
    }

    // Top tags by usage
    let topTags: any[] = [];
    try {
      topTags = await db.collection('tags')
        .find({}, { projection: { name: 1, usageCount: 1, category: 1, createdAt: 1 } })
        .sort({ usageCount: -1 })
        .limit(20)
        .toArray();
    } catch (error) {
      this.logger.warn(`Error fetching top tags: ${error instanceof Error ? error.message : String(error)}`);
      topTags = [];
    }

    return {
      tagsCreated: tagsCreated.map((t) => ({
        date: t._id || '',
        count: t.count || 0,
      })),
      tagsUsed: tagUsage.map((t) => ({
        date: t._id || '',
        tagsUsed: t.tagsUsed || 0,
        totalUsage: t.totalUsage || 0,
      })),
      topTags: topTags.map((t) => ({
        _id: t._id?.toString() || '',
        name: t.name || '',
        usageCount: t.usageCount || 0,
        category: t.category || 'general',
        createdAt: t.createdAt?.toISOString() || new Date().toISOString(),
      })),
    };
  }

  /**
   * Get storage analytics
   */
  async getStorageAnalytics(groupBy: 'album' | 'provider' | 'both' = 'both'): Promise<any> {
    await connectDB();
    const db = mongoose.connection.db;
    if (!db) {
      throw new Error('Database connection not established');
    }

    // Get all photos with storage info
    let photos: any[] = [];
    try {
      photos = await db.collection('photos')
        .find({}, { projection: { size: 1, storage: 1, albumId: 1 } })
        .toArray();
    } catch (error) {
      this.logger.warn(`Error fetching photos for storage analytics: ${error instanceof Error ? error.message : String(error)}`);
      photos = [];
    }
    
    if (photos.length === 0) {
      return {
        summary: {
          totalGB: 0,
          totalMB: 0,
          totalPhotos: 0,
          averageSizeMB: 0,
        },
        byProvider: groupBy === 'album' ? [] : [],
        byAlbum: groupBy === 'provider' ? [] : [],
      };
    }

    const totalBytes = photos.reduce((sum, p) => sum + (p.size || 0), 0);
    const totalGB = totalBytes / (1024 * 1024 * 1024);
    const totalMB = totalBytes / (1024 * 1024);

    // By provider
    const byProviderMap = new Map<string, { bytes: number; count: number }>();
    photos.forEach((p) => {
      const provider = p.storage?.provider || 'unknown';
      const current = byProviderMap.get(provider) || { bytes: 0, count: 0 };
      byProviderMap.set(provider, {
        bytes: current.bytes + (p.size || 0),
        count: current.count + 1,
      });
    });

    const byProvider = Array.from(byProviderMap.entries()).map(([provider, data]) => ({
      provider,
      totalGB: data.bytes / (1024 * 1024 * 1024),
      photoCount: data.count,
      percentage: totalBytes > 0 ? (data.bytes / totalBytes) * 100 : 0,
    }));

    // By album
    const byAlbumMap = new Map<string, { bytes: number; count: number }>();
    photos.forEach((p) => {
      const albumId = p.albumId?.toString() || 'no-album';
      const current = byAlbumMap.get(albumId) || { bytes: 0, count: 0 };
      byAlbumMap.set(albumId, {
        bytes: current.bytes + (p.size || 0),
        count: current.count + 1,
      });
    });

    const albumIds = Array.from(byAlbumMap.keys()).filter((id) => id !== 'no-album');
    let albums: any[] = [];
    if (albumIds.length > 0) {
      try {
        const objectIds = albumIds
          .map((id) => {
            try {
              return new mongoose.Types.ObjectId(id);
            } catch {
              return null;
            }
          })
          .filter((id) => id !== null);
        
        if (objectIds.length > 0) {
          albums = await db.collection('albums')
            .find({ _id: { $in: objectIds } })
            .project({ _id: 1, name: 1, alias: 1 })
            .toArray()
            .catch(() => []);
        }
      } catch (error) {
        this.logger.warn(`Error fetching albums for storage analytics: ${error instanceof Error ? error.message : String(error)}`);
        albums = [];
      }
    }

    const albumMap = new Map(albums.map((a) => [a._id.toString(), a]));

    const byAlbum = Array.from(byAlbumMap.entries())
      .map(([albumId, data]) => {
        const album = albumMap.get(albumId);
        const name = album
          ? (typeof album.name === 'string' ? album.name : album.name?.en || album.alias || 'Untitled')
          : 'No Album';
        return {
          _id: albumId,
          name,
          storageMB: data.bytes / (1024 * 1024),
          photoCount: data.count,
          percentage: totalBytes > 0 ? (data.bytes / totalBytes) * 100 : 0,
        };
      })
      .sort((a, b) => b.storageMB - a.storageMB)
      .slice(0, 20);

    return {
      summary: {
        totalGB: Math.round(totalGB * 100) / 100,
        totalMB: Math.round(totalMB * 100) / 100,
        totalPhotos: photos.length,
        averageSizeMB: photos.length > 0 ? Math.round((totalMB / photos.length) * 100) / 100 : 0,
      },
      byProvider: groupBy === 'album' ? [] : byProvider,
      byAlbum: groupBy === 'provider' ? [] : byAlbum,
    };
  }
}
