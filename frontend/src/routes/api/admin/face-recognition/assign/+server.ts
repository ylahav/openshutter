import { json } from '@sveltejs/kit';
import type { RequestHandler } from './$types';
import { connectToDatabase } from '$lib/mongodb';
import { ObjectId } from 'mongodb';

/**
 * POST /api/admin/face-recognition/assign
 * Manually assign a detected face to a person
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
		const { photoId, faceIndex, personId } = body;

		if (!photoId) {
			return json({ success: false, error: 'Photo ID is required' }, { status: 400 });
		}

		if (faceIndex === undefined || faceIndex === null) {
			return json({ success: false, error: 'Face index is required' }, { status: 400 });
		}

		if (!personId) {
			return json({ success: false, error: 'Person ID is required' }, { status: 400 });
		}

		const { db } = await connectToDatabase();

		// Get photo with face data
		const photo = await db.collection('photos').findOne({ _id: new ObjectId(photoId) });

		if (!photo) {
			return json({ success: false, error: 'Photo not found' }, { status: 404 });
		}

		if (!photo.faceRecognition?.faces || photo.faceRecognition.faces.length === 0) {
			return json({ success: false, error: 'No faces detected in photo' }, { status: 400 });
		}

		if (faceIndex < 0 || faceIndex >= photo.faceRecognition.faces.length) {
			return json({ success: false, error: 'Invalid face index' }, { status: 400 });
		}

		// Verify person exists
		const person = await db.collection('people').findOne({ _id: new ObjectId(personId) });
		if (!person) {
			return json({ success: false, error: 'Person not found' }, { status: 404 });
		}

		// Update the specific face with the person assignment
		const updatedFaces = [...photo.faceRecognition.faces];
		updatedFaces[faceIndex] = {
			...updatedFaces[faceIndex],
			matchedPersonId: new ObjectId(personId),
			confidence: 1.0 // Manual assignment gets 100% confidence
		};

		// Update photo's people array - ensure the assigned person is included for filtering
		// This allows photos to be filtered by people even when using face recognition
		const currentPeople = (photo.people || []).map((p: any) =>
			p instanceof ObjectId ? p.toString() : String(p)
		);
		const updatedPeople = [...new Set([...currentPeople, personId])].map((id) => new ObjectId(id));

		// Update photo
		await db.collection('photos').updateOne(
			{ _id: new ObjectId(photoId) },
			{
				$set: {
					'faceRecognition.faces': updatedFaces,
					people: updatedPeople
				}
			}
		);

		return json({
			success: true,
			data: {
				photoId,
				faceIndex,
				personId,
				personName: person.fullName
			}
		});
	} catch (error) {
		console.error('Face assignment error:', error);
		const errorMessage = error instanceof Error ? error.message : 'Face assignment failed';
		return json({ success: false, error: errorMessage }, { status: 500 });
	}
};

