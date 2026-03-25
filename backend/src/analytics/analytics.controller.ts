import { Controller, Get, Query, UseGuards, Logger, InternalServerErrorException, Res } from '@nestjs/common';
import { AdminGuard } from '../common/guards/admin.guard';
import { connectDB } from '../config/db';
import mongoose from 'mongoose';
import { AnalyticsService } from './analytics.service';
import { Response } from 'express';

@Controller('admin/analytics')
@UseGuards(AdminGuard)
export class AnalyticsController {
  private readonly logger = new Logger(AnalyticsController.name);

  constructor(private readonly analyticsService: AnalyticsService) {}
  /**
   * Get analytics statistics
   * Path: GET /api/admin/analytics
   */
  @Get()
  async getAnalytics() {
    try {
      await connectDB();
      const db = mongoose.connection.db;
      if (!db) throw new InternalServerErrorException('Database connection not established');

      // Get counts for all collections
      const [
        totalPhotos,
        publishedPhotos,
        totalAlbums,
        publicAlbums,
        totalUsers,
        activeUsers,
        totalTags,
        activeTags,
        totalLocations,
        activeLocations,
        totalPeople,
        activePeople,
        totalGroups,
        totalPages,
        publishedPages,
        totalBlogCategories,
        activeBlogCategories,
      ] = await Promise.all([
        db.collection('photos').countDocuments({}),
        db.collection('photos').countDocuments({ isPublished: true }),
        db.collection('albums').countDocuments({}),
        db.collection('albums').countDocuments({ isPublic: true }),
        db.collection('users').countDocuments({}),
        db.collection('users').countDocuments({ blocked: { $ne: true } }),
        db.collection('tags').countDocuments({}),
        db.collection('tags').countDocuments({ isActive: true }),
        db.collection('locations').countDocuments({}),
        db.collection('locations').countDocuments({ isActive: true }),
        db.collection('people').countDocuments({}),
        db.collection('people').countDocuments({ isActive: true }),
        db.collection('groups').countDocuments({}),
        db.collection('pages').countDocuments({}),
        db.collection('pages').countDocuments({ isPublished: true }),
        db.collection('blogcategories').countDocuments({}),
        db.collection('blogcategories').countDocuments({ isActive: true }),
      ]);

      // Get storage statistics (approximate)
      const photos = await db
        .collection('photos')
        .find({}, { projection: { size: 1 } })
        .toArray();
      const totalStorageBytes = photos.reduce((sum, photo) => sum + (photo.size || 0), 0);
      const totalStorageMB = Math.round((totalStorageBytes / (1024 * 1024)) * 100) / 100;
      const totalStorageGB = Math.round((totalStorageBytes / (1024 * 1024 * 1024)) * 100) / 100;

      // Get recent activity (last 30 days)
      const thirtyDaysAgo = new Date();
      thirtyDaysAgo.setDate(thirtyDaysAgo.getDate() - 30);

      const [
        recentPhotos,
        recentAlbums,
        recentUsers,
      ] = await Promise.all([
        db.collection('photos').countDocuments({ createdAt: { $gte: thirtyDaysAgo } }),
        db.collection('albums').countDocuments({ createdAt: { $gte: thirtyDaysAgo } }),
        db.collection('users').countDocuments({ createdAt: { $gte: thirtyDaysAgo } }),
      ]);

      // Get top albums by photo count
      const albumsWithCounts = await db
        .collection('albums')
        .aggregate([
          {
            $lookup: {
              from: 'photos',
              localField: '_id',
              foreignField: 'albumId',
              as: 'photos',
            },
          },
          {
            $project: {
              name: 1,
              alias: 1,
              photoCount: { $size: '$photos' },
              isPublic: 1,
            },
          },
          {
            $sort: { photoCount: -1 },
          },
          {
            $limit: 10,
          },
        ])
        .toArray();

      // Get top tags by usage (include category and color for enhanced display)
      const tagsWithUsage = await db
        .collection('tags')
        .find({}, { projection: { name: 1, usageCount: 1, isActive: 1, category: 1, color: 1 } })
        .sort({ usageCount: -1 })
        .limit(10)
        .toArray();

      // --- Enhanced tag analytics ---
      const unusedTagsCount = await db.collection('tags').countDocuments({ usageCount: 0 });
      const recentTagsCount = await db
        .collection('tags')
        .countDocuments({ createdAt: { $gte: thirtyDaysAgo } });

      const tagsByCategory = await db
        .collection('tags')
        .aggregate([
          { $group: { _id: { $ifNull: ['$category', 'general'] }, count: { $sum: 1 } } },
          { $sort: { count: -1 } },
        ])
        .toArray();

      const unusedTagsList = await db
        .collection('tags')
        .find({ usageCount: 0 }, { projection: { name: 1, category: 1, isActive: 1 } })
        .sort({ createdAt: -1 })
        .limit(20)
        .toArray();

      const recentTagsList = await db
        .collection('tags')
        .find({ createdAt: { $gte: thirtyDaysAgo } }, { projection: { name: 1, usageCount: 1, category: 1, createdAt: 1 } })
        .sort({ createdAt: -1 })
        .limit(10)
        .toArray();

      // Photo tag distribution: how many photos have 0, 1-3, 4-6, 7+ tags
      const photoTagDistribution = await db
        .collection('photos')
        .aggregate([
          {
            $project: {
              tagCount: { $size: { $ifNull: ['$tags', []] } },
            },
          },
          {
            $group: {
              _id: {
                $switch: {
                  branches: [
                    { case: { $eq: ['$tagCount', 0] }, then: '0' },
                    { case: { $lte: ['$tagCount', 3] }, then: '1-3' },
                    { case: { $lte: ['$tagCount', 6] }, then: '4-6' },
                    { case: { $gte: ['$tagCount', 7] }, then: '7+' },
                  ],
                  default: '0',
                },
              },
              count: { $sum: 1 },
            },
          },
          { $sort: { _id: 1 } },
        ])
        .toArray();

      return {
        overview: {
          photos: {
            total: totalPhotos,
            published: publishedPhotos,
            draft: totalPhotos - publishedPhotos,
          },
          albums: {
            total: totalAlbums,
            public: publicAlbums,
            private: totalAlbums - publicAlbums,
          },
          users: {
            total: totalUsers,
            active: activeUsers,
            blocked: totalUsers - activeUsers,
          },
          tags: {
            total: totalTags,
            active: activeTags,
            inactive: totalTags - activeTags,
          },
          locations: {
            total: totalLocations,
            active: activeLocations,
            inactive: totalLocations - activeLocations,
          },
          people: {
            total: totalPeople,
            active: activePeople,
            inactive: totalPeople - activePeople,
          },
          groups: {
            total: totalGroups,
          },
          pages: {
            total: totalPages,
            published: publishedPages,
            draft: totalPages - publishedPages,
          },
          blogCategories: {
            total: totalBlogCategories,
            active: activeBlogCategories,
            inactive: totalBlogCategories - activeBlogCategories,
          },
        },
        storage: {
          totalBytes: totalStorageBytes,
          totalMB: totalStorageMB,
          totalGB: totalStorageGB,
          formatted: totalStorageGB >= 1 ? `${totalStorageGB} GB` : `${totalStorageMB} MB`,
        },
        recentActivity: {
          photos: recentPhotos,
          albums: recentAlbums,
          users: recentUsers,
          period: '30 days',
        },
        topAlbums: albumsWithCounts.map((album) => ({
          _id: album._id.toString(),
          name: album.name,
          alias: album.alias,
          photoCount: album.photoCount || 0,
          isPublic: album.isPublic,
        })),
        topTags: tagsWithUsage.map((tag) => ({
          _id: tag._id.toString(),
          name: tag.name,
          usageCount: tag.usageCount || 0,
          isActive: tag.isActive,
          category: tag.category,
          color: tag.color,
        })),
        tagAnalytics: {
          overview: {
            unused: unusedTagsCount,
            recentlyCreated: recentTagsCount,
          },
          byCategory: tagsByCategory.map((c) => ({
            category: c._id,
            count: c.count,
          })),
          unusedTags: unusedTagsList.map((t) => ({
            _id: t._id.toString(),
            name: t.name,
            category: t.category,
            isActive: t.isActive,
          })),
          recentTags: recentTagsList.map((t) => ({
            _id: t._id.toString(),
            name: t.name,
            usageCount: t.usageCount || 0,
            category: t.category,
            createdAt: t.createdAt,
          })),
          photoTagDistribution: photoTagDistribution.map((d) => ({
            bucket: d._id,
            count: d.count,
          })),
        },
      };
    } catch (error) {
      this.logger.error(`Error fetching analytics: ${error instanceof Error ? error.message : String(error)}`);
      throw new InternalServerErrorException(
        `Failed to fetch analytics: ${error instanceof Error ? error.message : 'Unknown error'}`,
      );
    }
  }

  /**
   * Get views analytics
   * Path: GET /api/admin/analytics/views
   */
  @Get('views')
  async getViewsAnalytics(
    @Query('dateFrom') dateFrom?: string,
    @Query('dateTo') dateTo?: string,
    @Query('period') period?: 'day' | 'week' | 'month',
    @Query('type') type?: 'photo' | 'album' | 'all',
    @Query('resourceId') resourceId?: string,
  ) {
    try {
      const dateRange = {
        dateFrom: dateFrom ? new Date(dateFrom) : undefined,
        dateTo: dateTo ? new Date(dateTo) : undefined,
      };
      return await this.analyticsService.getViewsAnalytics(
        dateRange,
        period || 'day',
        type || 'all',
        resourceId,
      );
    } catch (error) {
      this.logger.error(`Error fetching views analytics: ${error instanceof Error ? error.message : String(error)}`);
      throw new InternalServerErrorException(
        `Failed to fetch views analytics: ${error instanceof Error ? error.message : 'Unknown error'}`,
      );
    }
  }

  /**
   * Get search analytics
   * Path: GET /api/admin/analytics/search
   */
  @Get('search')
  async getSearchAnalytics(
    @Query('dateFrom') dateFrom?: string,
    @Query('dateTo') dateTo?: string,
    @Query('limit') limit?: string,
    @Query('period') period?: 'day' | 'week' | 'month',
  ) {
    try {
      const dateRange = {
        dateFrom: dateFrom ? new Date(dateFrom) : undefined,
        dateTo: dateTo ? new Date(dateTo) : undefined,
      };
      const limitNum = limit ? parseInt(limit, 10) || 20 : 20;
      return await this.analyticsService.getSearchAnalytics(dateRange, limitNum, period || 'day');
    } catch (error) {
      this.logger.error(`Error fetching search analytics: ${error instanceof Error ? error.message : String(error)}`);
      throw new InternalServerErrorException(
        `Failed to fetch search analytics: ${error instanceof Error ? error.message : 'Unknown error'}`,
      );
    }
  }

  /**
   * Get tag usage trends
   * Path: GET /api/admin/analytics/tags
   */
  @Get('tags')
  async getTagUsageTrends(
    @Query('dateFrom') dateFrom?: string,
    @Query('dateTo') dateTo?: string,
    @Query('period') period?: 'day' | 'week' | 'month',
  ) {
    try {
      const dateRange = {
        dateFrom: dateFrom ? new Date(dateFrom) : undefined,
        dateTo: dateTo ? new Date(dateTo) : undefined,
      };
      return await this.analyticsService.getTagUsageTrends(dateRange, period || 'day');
    } catch (error) {
      this.logger.error(`Error fetching tag trends: ${error instanceof Error ? error.message : String(error)}`);
      throw new InternalServerErrorException(
        `Failed to fetch tag trends: ${error instanceof Error ? error.message : 'Unknown error'}`,
      );
    }
  }

  /**
   * Get storage analytics
   * Path: GET /api/admin/analytics/storage
   */
  @Get('storage')
  async getStorageAnalytics(@Query('groupBy') groupBy?: 'album' | 'provider' | 'both') {
    try {
      return await this.analyticsService.getStorageAnalytics(groupBy || 'both');
    } catch (error) {
      this.logger.error(`Error fetching storage analytics: ${error instanceof Error ? error.message : String(error)}`);
      throw new InternalServerErrorException(
        `Failed to fetch storage analytics: ${error instanceof Error ? error.message : 'Unknown error'}`,
      );
    }
  }

  /**
   * Export analytics data as CSV
   * Path: GET /api/admin/analytics/export
   */
  @Get('export')
  async exportAnalytics(
    @Res() res: Response,
    @Query('type') type: 'overview' | 'views' | 'search' | 'tags' | 'albums' | 'storage',
    @Query('dateFrom') dateFrom?: string,
    @Query('dateTo') dateTo?: string,
    @Query('format') format?: 'csv' | 'json',
    @Query('period') period?: 'day' | 'week' | 'month',
  ) {
    try {
      const dateRange = {
        dateFrom: dateFrom ? new Date(dateFrom) : undefined,
        dateTo: dateTo ? new Date(dateTo) : undefined,
      };

      let data: any;
      let filename: string;

      switch (type) {
        case 'views':
          data = await this.analyticsService.getViewsAnalytics(dateRange);
          filename = `views-analytics-${new Date().toISOString().split('T')[0]}.csv`;
          break;
        case 'search':
          data = await this.analyticsService.getSearchAnalytics(dateRange, 20, period || 'day');
          filename = `search-analytics-${new Date().toISOString().split('T')[0]}.csv`;
          break;
        case 'tags':
          data = await this.analyticsService.getTagUsageTrends(dateRange);
          filename = `tags-analytics-${new Date().toISOString().split('T')[0]}.csv`;
          break;
        case 'storage':
          data = await this.analyticsService.getStorageAnalytics();
          filename = `storage-analytics-${new Date().toISOString().split('T')[0]}.csv`;
          break;
        default:
          throw new Error(`Unsupported export type: ${type}`);
      }

      if (format === 'json') {
        res.setHeader('Content-Type', 'application/json');
        res.setHeader('Content-Disposition', `attachment; filename="${filename.replace('.csv', '.json')}"`);
        return res.json(data);
      }

      // Convert to CSV
      const csv = this.convertToCSV(data, type);
      res.setHeader('Content-Type', 'text/csv');
      res.setHeader('Content-Disposition', `attachment; filename="${filename}"`);
      return res.send(csv);
    } catch (error) {
      this.logger.error(`Error exporting analytics: ${error instanceof Error ? error.message : String(error)}`);
      throw new InternalServerErrorException(
        `Failed to export analytics: ${error instanceof Error ? error.message : 'Unknown error'}`,
      );
    }
  }

  /**
   * Convert analytics data to CSV format
   */
  private convertToCSV(data: any, type: string): string {
    const escapeCSV = (value: any): string => {
      if (value === null || value === undefined) return '';
      const str = String(value);
      if (str.includes(',') || str.includes('"') || str.includes('\n')) {
        return `"${str.replace(/"/g, '""')}"`;
      }
      return str;
    };

    const rows: string[] = [];

    switch (type) {
      case 'views':
        rows.push('Date,Views,Unique Views');
        if (data.trends) {
          data.trends.forEach((t: any) => {
            rows.push(`${escapeCSV(t.date)},${escapeCSV(t.views)},${escapeCSV(t.unique)}`);
          });
        }
        break;
      case 'search':
        rows.push('Query,Count,Average Results,Last Searched');
        if (data.popularQueries) {
          data.popularQueries.forEach((q: any) => {
            rows.push(`${escapeCSV(q.query)},${escapeCSV(q.count)},${escapeCSV(q.averageResults)},${escapeCSV(q.lastSearched)}`);
          });
        }
        if (data.tagFilterStats?.summary) {
          const s = data.tagFilterStats.summary;
          rows.push('');
          rows.push('Tag filter summary');
          rows.push(
            `Searches with tag filter,${escapeCSV(s.searchesWithTagFilter)}`,
          );
          rows.push(`Share of all searches %,${escapeCSV(s.shareOfSearchesPercent)}`);
          rows.push(
            `Zero-result searches (with tag filter),${escapeCSV(s.zeroResultWithTagFilter)}`,
          );
          rows.push(
            `Average results (when tag filter used),${escapeCSV(s.averageResultsWhenTagFilter)}`,
          );
        }
        if (data.tagFilterStats?.topFilterTags?.length) {
          rows.push('');
          rows.push('Tag,Tag ID,Filter uses,Zero-result uses,Average results');
          data.tagFilterStats.topFilterTags.forEach((t: any) => {
            rows.push(
              `${escapeCSV(t.name)},${escapeCSV(t.tagId)},${escapeCSV(t.filterUses)},${escapeCSV(t.zeroResultCount)},${escapeCSV(t.averageResults)}`,
            );
          });
        }

        if (data.tagFilterTrends?.length) {
          rows.push('');
          rows.push('Tag filter trends');
          rows.push('Date,Searches,Zero-result searches,Average results');
          data.tagFilterTrends.forEach((r: any) => {
            rows.push(
              `${escapeCSV(r.date)},${escapeCSV(r.searches)},${escapeCSV(r.zeroResultCount)},${escapeCSV(r.averageResults)}`,
            );
          });
        }

        if (data.tagFilterByType) {
          const bt = data.tagFilterByType;
          rows.push('');
          rows.push('Tag filter by search type');
          rows.push('Search type,Searches,Zero-result searches,Average results');
          (['photos', 'albums', 'people', 'locations', 'all'] as const).forEach((k) => {
            const row = bt[k];
            if (!row) return;
            rows.push(
              `${escapeCSV(k)},${escapeCSV(row.searches)},${escapeCSV(row.zeroResultCount)},${escapeCSV(row.averageResults)}`,
            );
          });
        }

        if (data.topTagPairs?.length) {
          rows.push('');
          rows.push('Top tag pairs in filters');
          rows.push('Tag A,Tag B,Tag A ID,Tag B ID,Filter uses,Zero-result uses,Average results,Pair key');
          data.topTagPairs.forEach((p: any) => {
            rows.push(
              `${escapeCSV(p.tagAName)},${escapeCSV(p.tagBName)},${escapeCSV(p.tagAId)},${escapeCSV(p.tagBId)},${escapeCSV(p.filterUses)},${escapeCSV(p.zeroResultCount)},${escapeCSV(p.averageResults)},${escapeCSV(p.pairKey)}`,
            );
          });
        }
        break;
      case 'tags':
        rows.push('Date,Tags Created,Tags Used,Total Usage');
        // Combine tagsCreated and tagsUsed by date
        const tagMap = new Map();
        if (data.tagsCreated) {
          data.tagsCreated.forEach((t: any) => {
            tagMap.set(t.date, { created: t.count, used: 0, totalUsage: 0 });
          });
        }
        if (data.tagsUsed) {
          data.tagsUsed.forEach((t: any) => {
            const existing = tagMap.get(t.date) || { created: 0, used: 0, totalUsage: 0 };
            tagMap.set(t.date, {
              created: existing.created,
              used: t.tagsUsed,
              totalUsage: t.totalUsage,
            });
          });
        }
        Array.from(tagMap.entries())
          .sort((a, b) => a[0].localeCompare(b[0]))
          .forEach(([date, values]) => {
            rows.push(`${escapeCSV(date)},${escapeCSV(values.created)},${escapeCSV(values.used)},${escapeCSV(values.totalUsage)}`);
          });
        break;
      case 'storage':
        rows.push('Provider,Total GB,Photo Count,Percentage');
        if (data.byProvider) {
          data.byProvider.forEach((p: any) => {
            rows.push(`${escapeCSV(p.provider)},${escapeCSV(p.totalGB)},${escapeCSV(p.photoCount)},${escapeCSV(p.percentage.toFixed(2))}`);
          });
        }
        rows.push('');
        rows.push('Album,Storage MB,Photo Count,Percentage');
        if (data.byAlbum) {
          data.byAlbum.forEach((a: any) => {
            rows.push(`${escapeCSV(a.name)},${escapeCSV(a.storageMB)},${escapeCSV(a.photoCount)},${escapeCSV(a.percentage.toFixed(2))}`);
          });
        }
        break;
    }

    return rows.join('\n');
  }
}
