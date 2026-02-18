import { Injectable, Logger } from '@nestjs/common';
import { connectDB } from '../config/db';
import mongoose from 'mongoose';

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

    // Get summary
    const [totalViews, uniqueUsers, photoViews, albumViews] = await Promise.all([
      db.collection('analytics_events').countDocuments(matchFilter),
      db.collection('analytics_events').distinct('userId', { ...matchFilter, userId: { $exists: true, $ne: null } }),
      db.collection('analytics_events').countDocuments({ ...matchFilter, type: 'photo_view' }),
      db.collection('analytics_events').countDocuments({ ...matchFilter, type: 'album_view' }),
    ]);

    // Group by date period
    const groupFormat: Record<string, string> = {
      day: '%Y-%m-%d',
      week: '%Y-W%V',
      month: '%Y-%m',
    };

    const trends = await db.collection('analytics_events').aggregate([
      { $match: matchFilter },
      {
        $group: {
          _id: {
            $dateToString: { format: groupFormat[period], date: '$timestamp' },
            type: '$type',
          },
          views: { $sum: 1 },
          uniqueUsers: { $addToSet: '$userId' },
        },
      },
      {
        $group: {
          _id: '$_id._id',
          views: { $sum: '$views' },
          unique: { $sum: { $size: '$uniqueUsers' } },
        },
      },
      { $sort: { _id: 1 } },
    ]).toArray();

    // Get top resources
    const topResources = await db.collection('analytics_events').aggregate([
      { $match: matchFilter },
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

    // Get resource names
    const resourceIds = topResources.map((r) => r._id).filter(Boolean);
    const photos = resourceIds.length > 0
      ? await db.collection('photos').find({ _id: { $in: resourceIds.map((id) => new mongoose.Types.ObjectId(id)) } })
          .project({ _id: 1, title: 1, filename: 1 })
          .toArray()
      : [];
    const albums = resourceIds.length > 0
      ? await db.collection('albums').find({ _id: { $in: resourceIds.map((id) => new mongoose.Types.ObjectId(id)) } })
          .project({ _id: 1, name: 1, alias: 1 })
          .toArray()
      : [];

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
        total: totalViews,
        unique: uniqueUsers.length,
        photos: photoViews,
        albums: albumViews,
      },
      trends: trends.map((t) => ({
        date: t._id,
        views: t.views,
        unique: t.unique || 0,
      })),
      topResources: topResources
        .filter((r) => r._id)
        .map((r) => ({
          _id: r._id,
          name: resourceMap.get(r._id) || 'Unknown',
          views: r.views,
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

    const dateFrom = dateRange?.dateFrom || new Date(Date.now() - 30 * 24 * 60 * 60 * 1000);
    const dateTo = dateRange?.dateTo || new Date();

    const matchFilter = {
      type: 'search',
      timestamp: { $gte: dateFrom, $lte: dateTo },
    };

    // Get summary
    const [totalSearches, uniqueQueries, searchesWithResults] = await Promise.all([
      db.collection('analytics_events').countDocuments(matchFilter),
      db.collection('analytics_events').distinct('metadata.query', { ...matchFilter, 'metadata.query': { $exists: true, $ne: '' } }),
      db.collection('analytics_events')
        .aggregate([
          { $match: { ...matchFilter, 'metadata.resultCount': { $exists: true } } },
          { $group: { _id: null, total: { $sum: '$metadata.resultCount' }, count: { $sum: 1 } } },
        ])
        .toArray(),
    ]);

    const averageResults = searchesWithResults.length > 0 && searchesWithResults[0].count > 0
      ? searchesWithResults[0].total / searchesWithResults[0].count
      : 0;

    // Popular queries
    const popularQueries = await db.collection('analytics_events').aggregate([
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

    // By type
    const byType = await db.collection('analytics_events').aggregate([
      { $match: matchFilter },
      {
        $group: {
          _id: '$metadata.searchType',
          count: { $sum: 1 },
        },
      },
    ]).toArray();

    const byTypeMap = new Map(byType.map((b) => [b._id || 'photos', b.count]));

    // Trends (daily)
    const trends = await db.collection('analytics_events').aggregate([
      { $match: matchFilter },
      {
        $group: {
          _id: { $dateToString: { format: '%Y-%m-%d', date: '$timestamp' } },
          searches: { $sum: 1 },
        },
      },
      { $sort: { _id: 1 } },
    ]).toArray();

    return {
      summary: {
        totalSearches,
        uniqueQueries: uniqueQueries.length,
        averageResults: Math.round(averageResults * 100) / 100,
      },
      popularQueries: popularQueries.map((q) => ({
        query: q._id,
        count: q.count,
        averageResults: Math.round((q.averageResults || 0) * 100) / 100,
        lastSearched: q.lastSearched.toISOString(),
      })),
      byType: {
        photos: byTypeMap.get('photos') || 0,
        albums: byTypeMap.get('albums') || 0,
        people: byTypeMap.get('people') || 0,
        locations: byTypeMap.get('locations') || 0,
      },
      trends: trends.map((t) => ({
        date: t._id,
        searches: t.searches,
      })),
    };
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

    const groupFormat: Record<string, string> = {
      day: '%Y-%m-%d',
      week: '%Y-W%V',
      month: '%Y-%m',
    };

    // Tag creation trends
    const tagsCreated = await db.collection('tags').aggregate([
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

    // Tag usage trends (from photos)
    const tagUsage = await db.collection('photos').aggregate([
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

    // Top tags by usage
    const topTags = await db.collection('tags')
      .find({}, { projection: { name: 1, usageCount: 1, category: 1, createdAt: 1 } })
      .sort({ usageCount: -1 })
      .limit(20)
      .toArray();

    return {
      tagsCreated: tagsCreated.map((t) => ({
        date: t._id,
        count: t.count,
      })),
      tagsUsed: tagUsage.map((t) => ({
        date: t._id,
        tagsUsed: t.tagsUsed,
        totalUsage: t.totalUsage,
      })),
      topTags: topTags.map((t) => ({
        _id: t._id.toString(),
        name: t.name,
        usageCount: t.usageCount || 0,
        category: t.category,
        createdAt: t.createdAt?.toISOString(),
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
    const photos = await db.collection('photos')
      .find({}, { projection: { size: 1, storage: 1, albumId: 1 } })
      .toArray();

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
    const albums = albumIds.length > 0
      ? await db.collection('albums')
          .find({ _id: { $in: albumIds.map((id) => new mongoose.Types.ObjectId(id)) } })
          .project({ _id: 1, name: 1, alias: 1 })
          .toArray()
      : [];

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
