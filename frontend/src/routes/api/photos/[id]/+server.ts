import { json } from '@sveltejs/kit';
import type { RequestHandler } from './$types';
import { connectToDatabase, connectMongoose } from '$lib/mongodb';
import { ObjectId } from 'mongodb';
import { TagModel } from '$lib/models/Tag';
import { PersonModel } from '$lib/models/Person';
import { LocationModel } from '$lib/models/Location';

export const GET: RequestHandler = async ({ params }) => {
	try {
		await connectMongoose();
		const { db } = await connectToDatabase();
		const { id } = await params;

		// Validate ObjectId format
		if (!ObjectId.isValid(id)) {
			return json({ success: false, error: 'Invalid photo ID format' }, { status: 400 });
		}

		const photoObjectId = new ObjectId(id);

		// Get photo
		const photo = await db.collection('photos').findOne({ _id: photoObjectId });

		if (!photo) {
			return json({ success: false, error: 'Photo not found' }, { status: 404 });
		}

		// Get album if albumId exists
		let album = null;
		if (photo.albumId) {
			const albumId =
				photo.albumId instanceof ObjectId ? photo.albumId : new ObjectId(String(photo.albumId));
			album = await db.collection('albums').findOne({ _id: albumId });
		}

		// Get tags if they exist
		let tags: any[] = [];
		if (photo.tags && Array.isArray(photo.tags) && photo.tags.length > 0) {
			const tagIds = photo.tags.map((tagId: any) =>
				tagId instanceof ObjectId ? tagId : new ObjectId(String(tagId))
			);
			tags = await TagModel.find({ _id: { $in: tagIds } }).lean();
		}

		// Get people if they exist
		let people: any[] = [];
		if (photo.people && Array.isArray(photo.people) && photo.people.length > 0) {
			const peopleIds = photo.people.map((personId: any) =>
				personId instanceof ObjectId ? personId : new ObjectId(String(personId))
			);
			people = await PersonModel.find({ _id: { $in: peopleIds } }).lean();
		}

		// Get location if it exists
		let location = null;
		if (photo.location) {
			const locationId =
				photo.location instanceof ObjectId ? photo.location : new ObjectId(String(photo.location));
			location = await LocationModel.findOne({ _id: locationId }).lean();
		}

		// Get uploadedBy user if it exists
		let uploadedBy = null;
		if (photo.uploadedBy) {
			const userId =
				photo.uploadedBy instanceof ObjectId ? photo.uploadedBy : new ObjectId(String(photo.uploadedBy));
			uploadedBy = await db.collection('users').findOne(
				{ _id: userId },
				{ projection: { name: 1, username: 1, email: 1 } }
			);
		}

		// Serialize photo
		const serialized: any = {
			...photo,
			_id: photo._id instanceof ObjectId ? photo._id.toString() : String(photo._id),
			albumId: photo.albumId
				? photo.albumId instanceof ObjectId
					? photo.albumId.toString()
					: String(photo.albumId)
				: null,
			tags: tags.map((tag: any) => ({
				...tag,
				_id: tag._id instanceof ObjectId ? tag._id.toString() : String(tag._id)
			})),
			people: people.map((person: any) => ({
				...person,
				_id: person._id instanceof ObjectId ? person._id.toString() : String(person._id)
			})),
			location: location
				? {
						...location,
						_id: location._id instanceof ObjectId ? location._id.toString() : String(location._id)
					}
				: null,
			uploadedBy: uploadedBy
				? {
						...uploadedBy,
						_id: uploadedBy._id instanceof ObjectId ? uploadedBy._id.toString() : String(uploadedBy._id)
					}
				: null,
			album: album
				? {
						...album,
						_id: album._id instanceof ObjectId ? album._id.toString() : String(album._id)
					}
				: null
		};

		// Ensure storage object is properly preserved
		if (photo.storage) {
			serialized.storage = {
				provider: photo.storage.provider || 'local',
				fileId: photo.storage.fileId || '',
				url: photo.storage.url || '',
				path: photo.storage.path || '',
				thumbnailPath: photo.storage.thumbnailPath || photo.storage.url || '',
				thumbnails: photo.storage.thumbnails || {},
				blurDataURL: photo.storage.blurDataURL,
				bucket: photo.storage.bucket,
				folderId: photo.storage.folderId
			};
		}

		return json(serialized);
	} catch (error) {
		console.error('Failed to get photo:', error);
		const errorMessage = error instanceof Error ? error.message : String(error);
		return json({ success: false, error: `Failed to get photo: ${errorMessage}` }, { status: 500 });
	}
};

