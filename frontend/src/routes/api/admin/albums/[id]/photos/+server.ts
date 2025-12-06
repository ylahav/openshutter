import { json } from '@sveltejs/kit';
import type { RequestHandler } from './$types';
import { connectToDatabase, connectMongoose } from '$lib/mongodb';
import { ExifExtractor } from '$lib/services/exif-extractor';
import { TagModel } from '$lib/models/Tag';
import { PersonModel } from '$lib/models/Person';
import { LocationModel } from '$lib/models/Location';
import { ObjectId } from 'mongodb';

export const GET: RequestHandler = async ({ params, url, locals }) => {
	try {
		const { id } = await params;
		const { db } = await connectToDatabase();

		if (!id) {
			return json({ success: false, error: 'Album ID is required' }, { status: 400 });
		}

		// Check if user is admin
		const user = locals.user
			? {
					id: locals.user._id || locals.user.id,
					email: locals.user.email,
					name: locals.user.name,
					role: locals.user.role || 'guest'
				}
			: null;

		console.log('Admin Photos API: User check:', {
			user: user ? { id: user.id, role: user.role } : 'null',
			isAdmin: user?.role === 'admin'
		});

		if (!user || user.role !== 'admin') {
			console.log('Admin Photos API: Access denied - not admin');
			return json({ success: false, error: 'Admin access required' }, { status: 403 });
		}

		let objectId;
		try {
			objectId = new ObjectId(id);
		} catch (error) {
			return json({ success: false, error: 'Invalid album ID format' }, { status: 400 });
		}

		// Get ALL photos for this album (including unpublished) - admin only
		const photosCollection = db.collection('photos');
		console.log(`Admin Photos API: Looking for ALL photos with albumId: ${id} or ObjectId: ${objectId}`);

		const query = {
			$or: [{ albumId: objectId }, { albumId: id }]
		};

		console.log(`Admin Photos API: Query:`, JSON.stringify(query, null, 2));

		const photos = await photosCollection.find(query).sort({ uploadedAt: -1 }).toArray();

		// If includeSubAlbums is requested, fetch photos from child albums
		const searchParams = url.searchParams;
		const includeSubAlbums = searchParams.get('includeSubAlbums') === 'true';

		if (includeSubAlbums) {
			console.log(`Admin Photos API: Fetching photos from sub-albums for ${id}`);

			// Find child albums
			const childAlbums = await db
				.collection('albums')
				.find({
					$or: [{ parentAlbumId: objectId }, { parentAlbumId: id }]
				})
				.toArray();

			if (childAlbums.length > 0) {
				const childAlbumIds = childAlbums.map((a) => a._id);
				const childAlbumIdsStr = childAlbums.map((a) => a._id.toString());

				// Fetch photos from child albums
				const childPhotos = await photosCollection
					.find({
						$or: [{ albumId: { $in: childAlbumIds } }, { albumId: { $in: childAlbumIdsStr } }]
					})
					.sort({ uploadedAt: -1 })
					.limit(100) // Limit to prevent overwhelming response
					.toArray();

				// Add source album info to child photos
				const albumMap = new Map(childAlbums.map((a) => [a._id.toString(), a]));

				const childPhotosWithSource = childPhotos.map((photo) => {
					const sourceAlbum = photo.albumId ? albumMap.get(photo.albumId.toString()) : null;
					return {
						...photo,
						sourceAlbum: sourceAlbum
							? {
									_id: sourceAlbum._id,
									name: sourceAlbum.name,
									alias: sourceAlbum.alias
								}
							: null
					};
				});

				// Combine photos
				photos.push(...childPhotosWithSource);
			}
		}

		console.log(`Admin Photos API: Found ${photos.length} photos for album ${id} (including unpublished)`);
		if (photos.length > 0) {
			console.log('Admin Photos API: First photo sample:', {
				_id: photos[0]._id,
				filename: photos[0].filename,
				albumId: photos[0].albumId,
				isPublished: photos[0].isPublished,
				storage: photos[0].storage
			});
		} else {
			console.log('Admin Photos API: No photos found - checking if album exists...');
			const albumCollection = db.collection('albums');
			const album = await albumCollection.findOne({ _id: objectId });
			console.log(
				'Admin Photos API: Album exists:',
				!!album,
				album ? { _id: album._id, alias: album.alias } : null
			);
		}

		// Process photos for EXIF data extraction (on-demand)
		const processedPhotos = await ExifExtractor.processPhotosForExif(photos);

		// Populate tags, people, and location names
		await connectMongoose();

		// Get all unique tag IDs
		const tagIds = new Set<string>();
		const peopleIds = new Set<string>();
		const locationIds = new Set<string>();

		processedPhotos.forEach((photo: any) => {
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
			TagModel.find({ _id: { $in: Array.from(tagIds).map((id) => new ObjectId(id)) } }).lean(),
			PersonModel.find({ _id: { $in: Array.from(peopleIds).map((id) => new ObjectId(id)) } }).lean(),
			LocationModel.find({ _id: { $in: Array.from(locationIds).map((id) => new ObjectId(id)) } }).lean()
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
					typeof location.name === 'string'
						? location.name
						: location.name?.en || location.name?.he || '';
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
		const populatedPhotos = processedPhotos.map((photo: any) => {
			const populated: any = { ...photo };

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

			// Normalize _id
			populated._id = photo._id instanceof ObjectId ? photo._id.toString() : String(photo._id);

			return populated;
		});

		return json({
			success: true,
			data: populatedPhotos
		});
	} catch (error) {
		console.error('Failed to get admin album photos:', error);
		const errorMessage = error instanceof Error ? error.message : String(error);
		return json(
			{ success: false, error: `Failed to get admin album photos: ${errorMessage}` },
			{ status: 500 }
		);
	}
};
