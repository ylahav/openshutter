import { json } from '@sveltejs/kit';
import type { RequestHandler } from './$types';
import { connectToDatabase } from '$lib/mongodb';
import { FaceRecognitionServerService } from '$lib/services/face-recognition-server';
import { storageManager } from '$lib/services/storage/manager';
import { ObjectId } from 'mongodb';

/**
 * POST /api/admin/face-recognition/person-descriptor
 * Extract and store face descriptor for a person from their profile image
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
		const { personId, imageUrl } = body;

		if (!personId) {
			return json({ success: false, error: 'Person ID is required' }, { status: 400 });
		}

		if (!imageUrl) {
			return json({ success: false, error: 'Image URL is required' }, { status: 400 });
		}

		const { db } = await connectToDatabase();

		// Get person
		const person = await db.collection('people').findOne({ _id: new ObjectId(personId) });

		if (!person) {
			return json({ success: false, error: 'Person not found' }, { status: 404 });
		}

		// Download image
		let imageBuffer: Buffer;
		try {
			if (imageUrl.startsWith('http://') || imageUrl.startsWith('https://')) {
				// External URL - fetch it
				const response = await fetch(imageUrl);
				if (!response.ok) {
					throw new Error('Failed to fetch image');
				}
				const arrayBuffer = await response.arrayBuffer();
				imageBuffer = Buffer.from(arrayBuffer);
			} else {
				// Local storage path
				const storageService = await storageManager.getProvider('local');
				const buffer = await storageService.getFileBuffer(imageUrl);
				if (!buffer) {
					throw new Error('Failed to load image from storage');
				}
				imageBuffer = buffer;
			}
		} catch (error) {
			return json({ success: false, error: 'Failed to load image' }, { status: 400 });
		}

		// Detect face (should be single face for profile image)
		const faces = await FaceRecognitionServerService.detectFacesFromBuffer(imageBuffer);

		if (faces.length === 0) {
			return json({ success: false, error: 'No face detected in image' }, { status: 400 });
		}

		if (faces.length > 1) {
			return json(
				{
					success: false,
					error: 'Multiple faces detected. Please use an image with a single face.'
				},
				{ status: 400 }
			);
		}

		const faceDescriptor = faces[0].descriptor;

		// Update person with face descriptor
		await db.collection('people').updateOne(
			{ _id: new ObjectId(personId) },
			{
				$set: {
					'faceRecognition.descriptor': faceDescriptor,
					'faceRecognition.extractedAt': new Date(),
					'faceRecognition.modelVersion': '1.0'
				}
			}
		);

		return json({
			success: true,
			data: {
				personId,
				descriptorExtracted: true,
				faceBox: faces[0].box
			}
		});
	} catch (error) {
		console.error('Person descriptor extraction error:', error);
		const errorMessage = error instanceof Error ? error.message : 'Descriptor extraction failed';
		return json({ success: false, error: errorMessage }, { status: 500 });
	}
};

