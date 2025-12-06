import { json } from '@sveltejs/kit';
import type { RequestHandler } from './$types';
import { connectToDatabase, connectMongoose } from '$lib/mongodb';
import { ObjectId } from 'mongodb';

export const GET: RequestHandler = async ({ url }) => {
	try {
		await connectMongoose();
		const { db } = await connectToDatabase();
		const searchParams = url.searchParams;

		const parentId = searchParams.get('parentId');
		const level = searchParams.get('level');

		// Build query
		const query: any = {};

		// Only filter by isPublic for root-level queries
		// For sub-albums, return all albums (access control can be handled at app level)
		if (parentId === 'root' || parentId === 'null' || !parentId) {
			query.isPublic = true;
		}

		if (parentId === 'root' || parentId === 'null') {
			query.parentAlbumId = null;
		} else if (parentId) {
			// Validate it's a valid ObjectId format first
			if (!ObjectId.isValid(parentId)) {
				console.warn(`Invalid parentId format: ${parentId}`);
				return json({ success: true, data: [] });
			}
			// Try multiple query formats to handle both ObjectId and string storage
			query.$or = [
				{ parentAlbumId: new ObjectId(parentId) },
				{ parentAlbumId: parentId },
				{ parentAlbumId: { $eq: new ObjectId(parentId) } }
			];
		}

		// Support level filter (for root albums, level 0)
		if (level !== undefined) {
			const levelNum = parseInt(level, 10);
			if (!isNaN(levelNum)) {
				query.level = levelNum;
			}
		}

		// Get albums with sorting
		const collection = db.collection('albums');
		let albums = await collection
			.find(query)
			.sort({ order: 1, createdAt: -1 })
			.toArray();

		// If no results with $or query and we have a parentId, try simpler query
		if (albums.length === 0 && parentId && parentId !== 'root' && parentId !== 'null') {
			const simpleQuery = { ...query };
			delete simpleQuery.$or;
			simpleQuery.parentAlbumId = new ObjectId(parentId);
			albums = await collection.find(simpleQuery).sort({ order: 1, createdAt: -1 }).toArray();
		}

		// Populate coverPhotoId if it exists
		const albumsWithCoverPhotos = await Promise.all(
			albums.map(async (album: any) => {
				if (album.coverPhotoId) {
					try {
						const coverPhoto = await db.collection('photos').findOne({
							_id: new ObjectId(album.coverPhotoId)
						});
						if (coverPhoto) {
							album.coverPhoto = coverPhoto;
						}
					} catch (error) {
						// Ignore errors when fetching cover photo
						console.warn(`Failed to fetch cover photo for album ${album._id}:`, error);
					}
				}
				return {
					...album,
					_id: album._id instanceof ObjectId ? album._id.toString() : String(album._id),
					parentAlbumId: album.parentAlbumId
						? album.parentAlbumId instanceof ObjectId
							? album.parentAlbumId.toString()
							: String(album.parentAlbumId)
						: null,
					coverPhotoId: album.coverPhotoId
						? album.coverPhotoId instanceof ObjectId
							? album.coverPhotoId.toString()
							: String(album.coverPhotoId)
						: null
				};
			})
		);

		return json(albumsWithCoverPhotos);
	} catch (error) {
		console.error('Failed to get albums:', error);
		const errorMessage = error instanceof Error ? error.message : String(error);
		return json(
			{ success: false, error: `Failed to get albums: ${errorMessage}` },
			{ status: 500 }
		);
	}
};

