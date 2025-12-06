import { json } from '@sveltejs/kit';
import type { RequestHandler } from './$types';
import { connectToDatabase, connectMongoose } from '$lib/mongodb';
import { ObjectId } from 'mongodb';

export const GET: RequestHandler = async ({ locals }) => {
	try {
		// Require admin access
		if (!locals.user || locals.user.role !== 'admin') {
			return json({ success: false, error: 'Unauthorized' }, { status: 401 });
		}

		await connectMongoose();
		const { db } = await connectToDatabase();

		if (!db) {
			throw new Error('Database connection not established');
		}

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
			activeBlogCategories
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
			db.collection('blogcategories').countDocuments({ isActive: true })
		]);

		// Get storage statistics (approximate)
		const photos = await db
			.collection('photos')
			.find({}, { projection: { fileSize: 1 } })
			.toArray();

		let totalStorageBytes = 0;
		for (const photo of photos) {
			if (photo.fileSize && typeof photo.fileSize === 'number') {
				totalStorageBytes += photo.fileSize;
			}
		}

		const totalStorageMB = Math.round((totalStorageBytes / (1024 * 1024)) * 100) / 100;
		const totalStorageGB = Math.round((totalStorageBytes / (1024 * 1024 * 1024)) * 100) / 100;

		// Get recent activity (last 30 days)
		const thirtyDaysAgo = new Date();
		thirtyDaysAgo.setDate(thirtyDaysAgo.getDate() - 30);

		const [recentPhotos, recentAlbums, recentUsers] = await Promise.all([
			db.collection('photos').countDocuments({ createdAt: { $gte: thirtyDaysAgo } }),
			db.collection('albums').countDocuments({ createdAt: { $gte: thirtyDaysAgo } }),
			db.collection('users').countDocuments({ createdAt: { $gte: thirtyDaysAgo } })
		]);

		// Get top albums by photo count (using aggregation to count photos)
		const albumsWithCounts = await db
			.collection('albums')
			.aggregate([
				{
					$lookup: {
						from: 'photos',
						localField: '_id',
						foreignField: 'albumId',
						as: 'photos'
					}
				},
				{
					$project: {
						name: 1,
						alias: 1,
						photoCount: { $size: '$photos' },
						isPublic: 1
					}
				},
				{
					$sort: { photoCount: -1 }
				},
				{
					$limit: 10
				}
			])
			.toArray();

		// Get top tags by usage count
		const tagsWithUsage = await db
			.collection('tags')
			.find({}, { projection: { name: 1, usageCount: 1, isActive: 1 } })
			.sort({ usageCount: -1 })
			.limit(10)
			.toArray();

		const analyticsData = {
			overview: {
				photos: {
					total: totalPhotos,
					published: publishedPhotos,
					draft: totalPhotos - publishedPhotos
				},
				albums: {
					total: totalAlbums,
					public: publicAlbums,
					private: totalAlbums - publicAlbums
				},
				users: {
					total: totalUsers,
					active: activeUsers,
					blocked: totalUsers - activeUsers
				},
				tags: {
					total: totalTags,
					active: activeTags,
					inactive: totalTags - activeTags
				},
				locations: {
					total: totalLocations,
					active: activeLocations,
					inactive: totalLocations - activeLocations
				},
				people: {
					total: totalPeople,
					active: activePeople,
					inactive: totalPeople - activePeople
				},
				groups: {
					total: totalGroups
				},
				pages: {
					total: totalPages,
					published: publishedPages,
					draft: totalPages - publishedPages
				},
				blogCategories: {
					total: totalBlogCategories,
					active: activeBlogCategories,
					inactive: totalBlogCategories - activeBlogCategories
				}
			},
			storage: {
				totalBytes: totalStorageBytes,
				totalMB: totalStorageMB,
				totalGB: totalStorageGB,
				formatted: totalStorageGB >= 1 ? `${totalStorageGB} GB` : `${totalStorageMB} MB`
			},
			recentActivity: {
				photos: recentPhotos,
				albums: recentAlbums,
				users: recentUsers,
				period: '30 days'
			},
			topAlbums: albumsWithCounts.map((album) => ({
				_id: String(album._id),
				name: album.name,
				alias: album.alias,
				photoCount: album.photoCount || 0,
				isPublic: album.isPublic
			})),
			topTags: tagsWithUsage.map((tag) => ({
				_id: String(tag._id),
				name: typeof tag.name === 'string' ? tag.name : tag.name?.en || tag.name?.he || 'Untitled',
				usageCount: tag.usageCount || 0,
				isActive: tag.isActive
			}))
		};

		return json({
			success: true,
			data: analyticsData
		});
	} catch (error) {
		console.error('Failed to get analytics:', error);
		const errorMessage = error instanceof Error ? error.message : String(error);
		return json({ success: false, error: `Failed to get analytics: ${errorMessage}` }, { status: 500 });
	}
};
