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

      // Get top tags by usage
      const tagsWithUsage = await db
        .collection('tags')
        .find({}, { projection: { name: 1, usageCount: 1, isActive: 1 } })
        .sort({ usageCount: -1 })
        .limit(10)
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
        })),
      };
    } catch (error) {
      this.logger.error(`Error fetching analytics: ${error instanceof Error ? error.message : String(error)}`);
      throw new InternalServerErrorException(
        `Failed to fetch analytics: ${error instanceof Error ? error.message : 'Unknown error'}`,
      );
    }
  }
}
