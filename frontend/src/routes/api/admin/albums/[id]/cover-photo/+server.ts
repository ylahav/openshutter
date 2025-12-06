import { json } from '@sveltejs/kit';
import type { RequestHandler } from './$types';
import { connectToDatabase } from '$lib/mongodb';
import { ObjectId } from 'mongodb';

export const PUT: RequestHandler = async ({ params, request, locals }) => {
	try {
		const { id } = await params;
		const body = await request.json();
		const { coverPhotoId } = body;

		// Check if user is admin
		const user = locals.user
			? {
					id: locals.user._id || locals.user.id,
					email: locals.user.email,
					name: locals.user.name,
					role: locals.user.role || 'guest'
				}
			: null;

		if (!user || user.role !== 'admin') {
			return json({ success: false, error: 'Unauthorized' }, { status: 401 });
		}

		const { db } = await connectToDatabase();

		// Get the album
		const album = await db.collection('albums').findOne({ _id: new ObjectId(id) });
		if (!album) {
			return json({ success: false, error: 'Album not found' }, { status: 404 });
		}

		// If coverPhotoId is provided, verify the photo exists
		if (coverPhotoId) {
			const photo = await db.collection('photos').findOne({
				_id: new ObjectId(coverPhotoId),
				isPublished: true
			});

			if (!photo) {
				return json({ success: false, error: 'Photo not found' }, { status: 404 });
			}
		}

		// Update the album's cover photo
		await db.collection('albums').updateOne(
			{ _id: new ObjectId(id) },
			{
				$set: {
					coverPhotoId: coverPhotoId ? new ObjectId(coverPhotoId) : null,
					updatedAt: new Date()
				}
			}
		);

		// If a cover photo was set, update isLeading flags
		if (coverPhotoId) {
			const coverId = new ObjectId(coverPhotoId);

			// Set the new cover photo as leading
			await db.collection('photos').updateOne({ _id: coverId }, { $set: { isLeading: true } });

			// Unset isLeading for all other photos in this album
			await db.collection('photos').updateMany(
				{
					albumId: new ObjectId(id),
					_id: { $ne: coverId }
				},
				{ $set: { isLeading: false } }
			);
		}

		return json({
			success: true,
			message: 'Cover photo updated successfully'
		});
	} catch (error) {
		console.error('Error updating album cover photo:', error);
		const errorMessage = error instanceof Error ? error.message : String(error);
		return json(
			{ success: false, error: `Failed to update cover photo: ${errorMessage}` },
			{ status: 500 }
		);
	}
};
