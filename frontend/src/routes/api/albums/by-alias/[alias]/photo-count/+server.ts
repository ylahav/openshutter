import { json } from '@sveltejs/kit';
import type { RequestHandler } from './$types';
import { connectToDatabase } from '$lib/mongodb';
import { AlbumPhotoCountService } from '$lib/services/album-photo-count';

export const GET: RequestHandler = async ({ params }) => {
	try {
		const { alias } = await params;
		const { db } = await connectToDatabase();

		if (!alias) {
			return json({ success: false, error: 'Album alias is required' }, { status: 400 });
		}

		// Find album by alias
		const album = await db.collection('albums').findOne({ alias });
		if (!album) {
			return json({ success: false, error: 'Album not found' }, { status: 404 });
		}

		// Get total photo count including child albums
		const photoCountResult = await AlbumPhotoCountService.getTotalPhotoCount(album._id);

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
