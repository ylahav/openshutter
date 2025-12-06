import { json } from '@sveltejs/kit';
import type { RequestHandler } from './$types';
import { connectToDatabase } from '$lib/mongodb';
import { AlbumPhotoCountService } from '$lib/services/album-photo-count';
import { ObjectId } from 'mongodb';

export const GET: RequestHandler = async ({ params }) => {
	try {
		const { id } = await params;
		const { db } = await connectToDatabase();

		if (!id) {
			return json({ success: false, error: 'Album ID is required' }, { status: 400 });
		}

		let objectId;
		try {
			objectId = new ObjectId(id);
		} catch (error) {
			return json({ success: false, error: 'Invalid album ID format' }, { status: 400 });
		}

		// Verify album exists
		const album = await db.collection('albums').findOne({ _id: objectId });
		if (!album) {
			return json({ success: false, error: 'Album not found' }, { status: 404 });
		}

		// Get total photo count including child albums
		const photoCountResult = await AlbumPhotoCountService.getTotalPhotoCount(objectId);

		return json({
			success: true,
			data: photoCountResult
		});
	} catch (error) {
		console.error('Error getting album photo count:', error);
		const errorMessage = error instanceof Error ? error.message : String(error);
		return json(
			{ success: false, error: `Failed to get album photo count: ${errorMessage}` },
			{ status: 500 }
		);
	}
};

