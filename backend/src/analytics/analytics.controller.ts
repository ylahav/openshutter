import { Controller, Get, UseGuards, Logger, InternalServerErrorException } from '@nestjs/common';
import { AdminGuard } from '../common/guards/admin.guard';
import { connectDB } from '../config/db';
import mongoose from 'mongoose';

@Controller('admin/analytics')
@UseGuards(AdminGuard)
export class AnalyticsController {
  private readonly logger = new Logger(AnalyticsController.name);
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
        .find({}, { projection: { fileSize: 1 } })
        .toArray();
      const totalStorageBytes = photos.reduce((sum, photo) => sum + (photo.fileSize || 0), 0);
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
}
