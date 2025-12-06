import { json } from '@sveltejs/kit';
import type { RequestHandler } from './$types';
import { connectToDatabase } from '$lib/mongodb';
import { ObjectId } from 'mongodb';

export const PUT: RequestHandler = async ({ params, request, locals }) => {
	try {
		// Require admin access
		if (!locals.user || locals.user.role !== 'admin') {
			return json({ success: false, error: 'Unauthorized' }, { status: 401 });
		}

		const { id } = await params;
		const body = await request.json();
		const { coverPhotoId } = body;

		if (!id) {
			return json({ success: false, error: 'Album ID is required' }, { status: 400 });
		}

		const { db } = await connectToDatabase();

		// Get the album
		let objectId: ObjectId;
		try {
			objectId = new ObjectId(id);
		} catch (error) {
			return json({ success: false, error: 'Invalid album ID format' }, { status: 400 });
		}

		const album = await db.collection('albums').findOne({ _id: objectId });
		if (!album) {
			return json({ success: false, error: 'Album not found' }, { status: 404 });
		}

		// If coverPhotoId is provided, verify the photo exists
		if (coverPhotoId) {
			let photoObjectId: ObjectId;
			try {
				photoObjectId = new ObjectId(coverPhotoId);
			} catch (error) {
				return json({ success: false, error: 'Invalid photo ID format' }, { status: 400 });
			}

			const photo = await db.collection('photos').findOne({
				_id: photoObjectId,
				isPublished: true
			});

			if (!photo) {
				return json({ success: false, error: 'Photo not found or not published' }, { status: 404 });
			}
		}

		// Update the album's cover photo
		await db.collection('albums').updateOne(
			{ _id: objectId },
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
					albumId: objectId,
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

