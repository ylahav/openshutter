import { json } from '@sveltejs/kit';
import type { RequestHandler } from './$types';
import { connectToDatabase } from '$lib/mongodb';
import { FaceRecognitionServerService } from '$lib/services/face-recognition-server';
import { ObjectId } from 'mongodb';

/**
 * POST /api/admin/face-recognition/match
 * Match detected faces against known people
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
		const { photoId, threshold = 0.6 } = body;

		if (!photoId) {
			return json({ success: false, error: 'Photo ID is required' }, { status: 400 });
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

		// Get all people with face descriptors
		const people = await db
			.collection('people')
			.find({
				'faceRecognition.descriptor': { $exists: true },
				isActive: true
			})
			.toArray();

		if (people.length === 0) {
			return json({
				success: true,
				data: {
					photoId,
					matches: [],
					message: 'No people with face descriptors found'
				}
			});
		}

		// Normalize descriptor to ensure it's a number[] array with correct length (128)
		const normalizeDescriptor = (desc: any): number[] | null => {
			if (!desc) return null;

			let normalized: number[];

			if (Array.isArray(desc)) {
				// Ensure it's a plain number array, not Float32Array
				normalized = Array.from(desc).map((n) => {
					const num = typeof n === 'number' ? n : parseFloat(String(n));
					return isNaN(num) ? 0 : num;
				});
			} else if (desc instanceof Float32Array) {
				normalized = Array.from(desc);
			} else if (desc instanceof ArrayBuffer) {
				normalized = Array.from(new Float32Array(desc));
			} else {
				// Try to convert to array
				try {
					normalized = Array.from(desc as any);
				} catch {
					return null;
				}
			}

			// Validate length (face-api.js descriptors should be 128D)
			if (normalized.length !== 128) {
				console.warn(`Descriptor has incorrect length: ${normalized.length}, expected 128`);
				return null;
			}

			return normalized;
		};

		// Prepare known descriptors
		const knownDescriptors = people
			.filter((person) => person.faceRecognition?.descriptor)
			.map((person) => {
				const normalized = normalizeDescriptor(person.faceRecognition.descriptor);
				return normalized
					? {
							personId: person._id.toString(),
							descriptor: normalized
						}
					: null;
			})
			.filter((d): d is { personId: string; descriptor: number[] } => d !== null);

		// Match each detected face
		const matches: Array<{
			faceIndex: number;
			personId: string | null;
			confidence: number | null;
		}> = [];

		for (let i = 0; i < photo.faceRecognition.faces.length; i++) {
			const face = photo.faceRecognition.faces[i];
			const normalizedFaceDescriptor = normalizeDescriptor(face.descriptor);

			if (!normalizedFaceDescriptor) {
				matches.push({
					faceIndex: i,
					personId: null,
					confidence: null
				});
				continue;
			}

			const match = FaceRecognitionServerService.findBestMatch(
				normalizedFaceDescriptor,
				knownDescriptors,
				threshold
			);

			matches.push({
				faceIndex: i,
				personId: match?.personId || null,
				confidence: match?.confidence || null
			});
		}

		// Update photo with matched people
		const matchedPersonIds = matches.filter((m) => m.personId).map((m) => new ObjectId(m.personId!));

		// Update face recognition data with matches
		const updatedFaces = photo.faceRecognition.faces.map((face: any, index: number) => {
			const match = matches[index];
			return {
				...face,
				matchedPersonId: match.personId ? new ObjectId(match.personId) : undefined,
				confidence: match.confidence || undefined
			};
		});

		// Update photo
		await db.collection('photos').updateOne(
			{ _id: new ObjectId(photoId) },
			{
				$set: {
					'faceRecognition.faces': updatedFaces,
					people: [
						...new Set([
							...(photo.people || []).map((p: any) => p.toString()),
							...matchedPersonIds.map((id) => id.toString())
						])
					].map((id) => new ObjectId(id))
				}
			}
		);

		return json({
			success: true,
			data: {
				photoId,
				matches: matches.map((m) => ({
					faceIndex: m.faceIndex,
					personId: m.personId,
					confidence: m.confidence,
					personName: m.personId
						? people.find((p) => p._id.toString() === m.personId)?.fullName
						: null
				}))
			}
		});
	} catch (error) {
		console.error('Face matching error:', error);
		const errorMessage = error instanceof Error ? error.message : 'Face matching failed';
		return json({ success: false, error: errorMessage }, { status: 500 });
	}
};

