import { json } from '@sveltejs/kit';
import type { RequestHandler } from './$types';
import { connectToDatabase } from '$lib/mongodb';
import { ExifExtractor } from '$lib/services/exif-extractor';
import { ObjectId } from 'mongodb';

export const GET: RequestHandler = async ({ url }) => {
	try {
		const { db } = await connectToDatabase();
		const searchParams = url.searchParams;

		const limit = parseInt(searchParams.get('limit') || '5');

		// Get photos marked as gallery leading
		const photosCollection = db.collection('photos');
		const photos = await photosCollection
			.find({
				isGalleryLeading: true,
				isPublished: true
			})
			.sort({ uploadedAt: -1 })
			.limit(limit)
			.toArray();

		// Process photos for EXIF data extraction (on-demand)
		const processedPhotos = await ExifExtractor.processPhotosForExif(photos);

		// Normalize _id to string
		const data = processedPhotos.map((photo: any) => ({
			...photo,
			_id: photo._id instanceof ObjectId ? photo._id.toString() : String(photo._id)
		}));

		return json({
			success: true,
			data
		});
	} catch (error) {
		console.error('Failed to get gallery leading photos:', error);
		const errorMessage = error instanceof Error ? error.message : String(error);
		return json(
			{ success: false, error: `Failed to get gallery leading photos: ${errorMessage}` },
			{ status: 500 }
		);
	}
};
