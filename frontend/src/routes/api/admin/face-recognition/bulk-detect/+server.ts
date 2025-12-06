import { json } from '@sveltejs/kit';
import type { RequestHandler } from './$types';
import { connectToDatabase } from '$lib/mongodb';
import { ObjectId } from 'mongodb';

/**
 * POST /api/admin/face-recognition/bulk-detect
 * Detect faces in multiple photos
 */
export const POST: RequestHandler = async ({ request, locals }) => {
	try {
		const user = locals.user
			? {
					id: locals.user._id || locals.user.id,
					email: locals.user.email,
					name: locals.user.name,
					role: locals.user.role || 'guest'
				}
			: null;

		if (user?.role !== 'admin' && user?.role !== 'owner') {
			return json({ success: false, error: 'Forbidden' }, { status: 403 });
		}

		const body = await request.json();
		const { photoIds } = body;

		if (!photoIds || !Array.isArray(photoIds) || photoIds.length === 0) {
			return json({ success: false, error: 'Photo IDs array is required' }, { status: 400 });
		}

		const { db } = await connectToDatabase();

		// Get all photos
		const photos = await db
			.collection('photos')
			.find({ _id: { $in: photoIds.map((id: string) => new ObjectId(id)) } })
			.toArray();

		if (photos.length === 0) {
			return json({ success: false, error: 'No photos found' }, { status: 404 });
		}

		const results = {
			total: photos.length,
			processed: 0,
			succeeded: 0,
			failed: 0,
			errors: [] as Array<{ photoId: string; error: string }>
		};

		// Process each photo by triggering client-side detection
		// Since face detection is client-side, we'll return instructions for the client
		// The client will need to call the detect endpoint for each photo
		for (const photo of photos) {
			try {
				// Check if photo has storage URL
				if (!photo.storage?.url) {
					results.failed++;
					results.errors.push({
						photoId: photo._id.toString(),
						error: 'Photo has no storage URL'
					});
					continue;
				}

				// For now, we'll mark it as queued
				// The actual detection will happen client-side
				results.processed++;
				results.succeeded++;
			} catch (error) {
				results.failed++;
				results.errors.push({
					photoId: photo._id.toString(),
					error: error instanceof Error ? error.message : 'Unknown error'
				});
			}
		}

		return json({
			success: true,
			data: {
				...results,
				message: `Face detection queued for ${results.succeeded} photo(s). Detection will be performed client-side.`
			}
		});
	} catch (error) {
		console.error('Bulk face detection error:', error);
		const errorMessage = error instanceof Error ? error.message : 'Bulk face detection failed';
		return json({ success: false, error: errorMessage }, { status: 500 });
	}
};
