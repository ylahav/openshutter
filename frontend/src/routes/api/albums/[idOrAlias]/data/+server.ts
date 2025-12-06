import { json } from '@sveltejs/kit';
import type { RequestHandler } from './$types';
import { connectToDatabase, connectMongoose } from '$lib/mongodb';
import { ObjectId } from 'mongodb';
import { checkAlbumAccess } from '$lib/access-control-server';
import { TagModel } from '$lib/models/Tag';
import { PersonModel } from '$lib/models/Person';
import { LocationModel } from '$lib/models/Location';

export const GET: RequestHandler = async ({ params, url, locals }) => {
	try {
		const { idOrAlias } = await params;
		const searchParams = url.searchParams;

		// Pagination parameters
		const page = parseInt(searchParams.get('page') || '1');
		const limit = parseInt(searchParams.get('limit') || '50');
		const skip = (page - 1) * limit;

		await connectMongoose();
		const { db } = await connectToDatabase();

		// Get the album by ID or alias
		let album: any = null;
		if (ObjectId.isValid(idOrAlias)) {
			album = await db.collection('albums').findOne({ _id: new ObjectId(idOrAlias) });
		}
		if (!album) {
			album = await db.collection('albums').findOne({ alias: idOrAlias });
		}

		if (!album) {
			return json({ success: false, error: 'Album not found' }, { status: 404 });
		}

		// Check access control (admins can access everything)
		const user = locals.user
			? {
					id: locals.user._id || locals.user.id,
					email: locals.user.email,
					name: locals.user.name,
					role: locals.user.role || 'guest'
				}
			: null;

		if (user?.role !== 'admin') {
			const hasAccess = await checkAlbumAccess(
				{
					isPublic: album.isPublic,
					allowedGroups: album.allowedGroups,
					allowedUsers: album.allowedUsers,
					createdBy: album.createdBy
				},
				user
			);

			if (!hasAccess) {
				return json({ success: false, error: 'Access denied' }, { status: 403 });
			}
		}

		const albumId = album._id instanceof ObjectId ? album._id.toString() : String(album._id);
		const albumObjectId = new ObjectId(albumId);

		// Get sub-albums (child albums)
		let subAlbums: any[] = [];
		const subAlbumsQuery = {
			$or: [{ parentAlbumId: albumId }, { parentAlbumId: albumObjectId }],
			isPublic: true
		};

		subAlbums = await db
			.collection('albums')
			.find(subAlbumsQuery)
			.sort({ order: 1 })
			.toArray();

		// Get photos for this album with pagination
		const photosQuery = {
			$or: [{ albumId: albumId }, { albumId: albumObjectId }],
			isPublished: true
		};

		const [photos, totalPhotos] = await Promise.all([
			db
				.collection('photos')
				.find(photosQuery)
				.sort({ uploadedAt: -1 })
				.skip(skip)
				.limit(limit)
				.toArray(),
			db.collection('photos').countDocuments(photosQuery)
		]);

		// Get all unique tag IDs, people IDs, and location IDs
		const tagIds = new Set<string>();
		const peopleIds = new Set<string>();
		const locationIds = new Set<string>();

		photos.forEach((photo: any) => {
			if (photo.tags && Array.isArray(photo.tags)) {
				photo.tags.forEach((tagId: any) => {
					tagIds.add(String(tagId));
				});
			}
			if (photo.people && Array.isArray(photo.people)) {
				photo.people.forEach((personId: any) => {
					peopleIds.add(String(personId));
				});
			}
			if (photo.location) {
				locationIds.add(String(photo.location));
			}
		});

		// Fetch all tags, people, and locations
		const [tags, people, locations] = await Promise.all([
			tagIds.size > 0
				? TagModel.find({ _id: { $in: Array.from(tagIds).map((id) => new ObjectId(id)) } }).lean()
				: [],
			peopleIds.size > 0
				? PersonModel.find({ _id: { $in: Array.from(peopleIds).map((id) => new ObjectId(id)) } }).lean()
				: [],
			locationIds.size > 0
				? LocationModel.find({ _id: { $in: Array.from(locationIds).map((id) => new ObjectId(id)) } }).lean()
				: []
		]);

		// Create lookup maps
		const tagMap = new Map(tags.map((tag: any) => [String(tag._id), tag.name]));
		const peopleMap = new Map(
			people.map((person: any) => {
				const fullName =
					typeof person.fullName === 'string'
						? person.fullName
						: person.fullName?.en || person.fullName?.he || '';
				const firstName =
					typeof person.firstName === 'string'
						? person.firstName
						: person.firstName?.en || person.firstName?.he || '';
				return [String(person._id), fullName || firstName || 'Unknown'];
			})
		);
		const locationMap = new Map(
			locations.map((location: any) => {
				const name =
					typeof location.name === 'string' ? location.name : location.name?.en || location.name?.he || '';
				return [
					String(location._id),
					{
						name,
						address: location.address,
						coordinates: location.coordinates
					}
				];
			})
		);

		// Populate photos with names
		const populatedPhotos = photos.map((photo: any) => {
			const populated: any = {
				...photo,
				_id: photo._id instanceof ObjectId ? photo._id.toString() : String(photo._id),
				albumId: photo.albumId
					? photo.albumId instanceof ObjectId
						? photo.albumId.toString()
						: String(photo.albumId)
					: null
			};

			// Populate tags
			if (photo.tags && Array.isArray(photo.tags)) {
				populated.tags = photo.tags.map((tagId: any) => tagMap.get(String(tagId)) || tagId);
			}

			// Populate people
			if (photo.people && Array.isArray(photo.people)) {
				populated.people = photo.people.map((personId: any) => peopleMap.get(String(personId)) || personId);
			}

			// Populate location
			if (photo.location) {
				const locationData = locationMap.get(String(photo.location));
				if (locationData) {
					populated.location = locationData;
				}
			}

			return populated;
		});

		// Serialize album
		const serializedAlbum: any = {
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

		// Serialize sub-albums
		const serializedSubAlbums = subAlbums.map((subAlbum: any) => ({
			...subAlbum,
			_id: subAlbum._id instanceof ObjectId ? subAlbum._id.toString() : String(subAlbum._id),
			parentAlbumId: subAlbum.parentAlbumId
				? subAlbum.parentAlbumId instanceof ObjectId
					? subAlbum.parentAlbumId.toString()
					: String(subAlbum.parentAlbumId)
				: null,
			coverPhotoId: subAlbum.coverPhotoId
				? subAlbum.coverPhotoId instanceof ObjectId
					? subAlbum.coverPhotoId.toString()
					: String(subAlbum.coverPhotoId)
				: null
		}));

		// Calculate pagination info
		const totalPages = Math.ceil(totalPhotos / limit);
		const hasNextPage = page < totalPages;
		const hasPrevPage = page > 1;

		return json({
			album: serializedAlbum,
			subAlbums: serializedSubAlbums,
			photos: populatedPhotos,
			pagination: {
				page,
				limit,
				total: totalPhotos,
				totalPages,
				hasNextPage,
				hasPrevPage
			}
		});
	} catch (error) {
		console.error('API: Error getting album data:', error);
		const errorMessage = error instanceof Error ? error.message : String(error);
		return json(
			{ success: false, error: `Failed to get album data: ${errorMessage}` },
			{ status: 500 }
		);
	}
};

