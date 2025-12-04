import {
	Controller,
	Post,
	Body,
	UseGuards,
	BadRequestException,
	NotFoundException,
} from '@nestjs/common';
import { AdminGuard } from '../common/guards/admin.guard';
import { FaceDetectionService } from './face-detection.service';
import { connectDB } from '../config/db';
import mongoose, { Types } from 'mongoose';

@Controller('admin/face-detection')
@UseGuards(AdminGuard)
export class FaceDetectionController {
	constructor(private readonly faceDetectionService: FaceDetectionService) {}

	/**
	 * Detect faces in a photo
	 * Path: POST /api/admin/face-recognition/detect
	 * Note: Face detection is done client-side, this endpoint stores the results
	 */
	@Post('detect')
	async detectFaces(
		@Body() body: { photoId: string; faces: any[]; onlyMatched?: boolean }
	) {
		try {
			const { photoId, faces, onlyMatched } = body;

			if (!photoId) {
				throw new BadRequestException('Photo ID is required');
			}

			if (!faces || !Array.isArray(faces)) {
				throw new BadRequestException('Face detection results are required');
			}

			await connectDB();
			const db = mongoose.connection.db;
			if (!db) throw new Error('Database connection not established');

			let objectId: Types.ObjectId;
			try {
				objectId = new Types.ObjectId(photoId);
			} catch (error) {
				throw new BadRequestException('Invalid photo ID format');
			}

			const photo = await db.collection('photos').findOne({ _id: objectId });
			if (!photo) {
				throw new NotFoundException('Photo not found');
			}

			// Preserve existing matches if face count matches
			const existingFaces = photo.faceRecognition?.faces || [];
			let updatedFaces = faces.map((face: any, index: number) => {
				const existingFace = existingFaces[index];
				return {
					descriptor: face.descriptor, // 128D vector from client-side detection
					box: face.box,
					landmarks: face.landmarks,
					detectedAt: new Date(),
					// Use provided match or preserve existing match if available
					matchedPersonId:
						face.matchedPersonId || existingFace?.matchedPersonId
							? new Types.ObjectId(face.matchedPersonId || existingFace.matchedPersonId)
							: null,
					confidence: face.confidence || existingFace?.confidence || null,
				};
			});

			// If onlyMatched flag is set, filter to only matched faces
			if (onlyMatched) {
				updatedFaces = updatedFaces.filter((face: any) => face.matchedPersonId);
			}

			// Collect all matched person IDs
			const matchedPersonIds = updatedFaces
				.filter((face: any) => face.matchedPersonId)
				.map((face: any) => face.matchedPersonId);

			// Update photo's people array with matched people
			const currentPeople = (photo.people || []).map((p: any) =>
				p instanceof Types.ObjectId ? p.toString() : String(p)
			);
			const matchedPersonIdStrings = matchedPersonIds.map((id) => id.toString());
			const updatedPeople = [
				...new Set([...currentPeople, ...matchedPersonIdStrings]),
			].map((id) => new Types.ObjectId(id));

			await db.collection('photos').updateOne(
				{ _id: objectId },
				{
					$set: {
						'faceRecognition.faces': updatedFaces,
						'faceRecognition.processedAt': new Date(),
						'faceRecognition.modelVersion': '1.0',
						people: updatedPeople, // Ensure matched people are in the people array
					},
				}
			);

			return {
				success: true,
				data: {
					photoId,
					facesDetected: faces.length,
					faces: faces.map((face: any) => ({
						box: face.box,
						landmarks: face.landmarks,
						// Don't send descriptor back to client (too large)
					})),
				},
			};
		} catch (error) {
			console.error('Failed to detect faces:', error);
			if (error instanceof BadRequestException || error instanceof NotFoundException) {
				throw error;
			}
			throw new Error(
				`Failed to detect faces: ${error instanceof Error ? error.message : 'Unknown error'}`
			);
		}
	}

	/**
	 * Match detected faces with people in the database
	 * Path: POST /api/admin/face-recognition/match
	 */
	@Post('match')
	async matchFaces(@Body() body: { photoId: string; threshold?: number }) {
		try {
			const { photoId, threshold = 0.6 } = body;

			if (!photoId) {
				throw new BadRequestException('Photo ID is required');
			}

			await connectDB();
			const db = mongoose.connection.db;
			if (!db) throw new Error('Database connection not established');

			let objectId: Types.ObjectId;
			try {
				objectId = new Types.ObjectId(photoId);
			} catch (error) {
				throw new BadRequestException('Invalid photo ID format');
			}

			const photo = await db.collection('photos').findOne({ _id: objectId });
			if (!photo) {
				throw new NotFoundException('Photo not found');
			}

			if (!photo.faceRecognition?.faces || photo.faceRecognition.faces.length === 0) {
				throw new BadRequestException('No faces detected in this photo');
			}

			// Get all people with face descriptors
			const people = await db
				.collection('people')
				.find({
					'faceRecognition.descriptor': { $exists: true, $ne: null },
				})
				.toArray();

			// Match faces
			const matches = await this.faceDetectionService.matchFaces(
				photo.faceRecognition.faces,
				people,
				threshold
			);

			// Update photo with matched faces
			const updatedFaces = photo.faceRecognition.faces.map((face: any, index: number) => {
				const match = matches.find((m) => m.faceIndex === index);
				return {
					...face,
					matchedPersonId: match?.personId ? new Types.ObjectId(match.personId) : null,
					confidence: match?.confidence || null,
				};
			});

			// Collect matched person IDs
			const matchedPersonIds = matches
				.filter((m) => m.personId)
				.map((m) => new Types.ObjectId(m.personId!));

			// Update photo's people array
			const currentPeople = (photo.people || []).map((p: any) =>
				p instanceof Types.ObjectId ? p.toString() : String(p)
			);
			const matchedPersonIdStrings = matchedPersonIds.map((id) => id.toString());
			const updatedPeople = [
				...new Set([...currentPeople, ...matchedPersonIdStrings]),
			].map((id) => new Types.ObjectId(id));

			await db.collection('photos').updateOne(
				{ _id: objectId },
				{
					$set: {
						'faceRecognition.faces': updatedFaces,
						'faceRecognition.matchedAt': new Date(),
						people: updatedPeople,
					},
				}
			);

			return {
				success: true,
				data: {
					matches: matches.map((m) => ({
						faceIndex: m.faceIndex,
						personId: m.personId,
						confidence: m.confidence,
					})),
				},
			};
		} catch (error) {
			console.error('Failed to match faces:', error);
			if (error instanceof BadRequestException || error instanceof NotFoundException) {
				throw error;
			}
			throw new Error(
				`Failed to match faces: ${error instanceof Error ? error.message : 'Unknown error'}`
			);
		}
	}

	/**
	 * Assign a face to a person
	 * Path: POST /api/admin/face-recognition/assign
	 */
	@Post('assign')
	async assignFace(
		@Body() body: { photoId: string; faceIndex: number; personId: string | null }
	) {
		try {
			const { photoId, faceIndex, personId } = body;

			if (!photoId) {
				throw new BadRequestException('Photo ID is required');
			}

			if (faceIndex === undefined || faceIndex === null) {
				throw new BadRequestException('Face index is required');
			}

			await connectDB();
			const db = mongoose.connection.db;
			if (!db) throw new Error('Database connection not established');

			let objectId: Types.ObjectId;
			try {
				objectId = new Types.ObjectId(photoId);
			} catch (error) {
				throw new BadRequestException('Invalid photo ID format');
			}

			const photo = await db.collection('photos').findOne({ _id: objectId });
			if (!photo) {
				throw new NotFoundException('Photo not found');
			}

			if (!photo.faceRecognition?.faces || faceIndex >= photo.faceRecognition.faces.length) {
				throw new BadRequestException('Invalid face index');
			}

			// Verify person exists if assigning
			if (personId) {
				const personObjectId = new Types.ObjectId(personId);
				const person = await db.collection('people').findOne({ _id: personObjectId });
				if (!person) {
					throw new NotFoundException('Person not found');
				}
			}

			// Update the specific face
			const updatedFaces = [...photo.faceRecognition.faces];
			updatedFaces[faceIndex] = {
				...updatedFaces[faceIndex],
				matchedPersonId: personId ? new Types.ObjectId(personId) : null,
				confidence: personId ? 1.0 : null, // Manual assignment gets 100% confidence
			};

			// Update photo's people array
			const currentPeople = (photo.people || []).map((p: any) =>
				p instanceof Types.ObjectId ? p.toString() : String(p)
			);
			let updatedPeople = [...currentPeople];
			if (personId) {
				updatedPeople = [...new Set([...updatedPeople, personId])];
			} else {
				// If unassigning, we don't remove from people array (photo might have other references)
			}
			const updatedPeopleObjectIds = updatedPeople.map((id) => new Types.ObjectId(id));

			await db.collection('photos').updateOne(
				{ _id: objectId },
				{
					$set: {
						'faceRecognition.faces': updatedFaces,
						people: updatedPeopleObjectIds,
					},
				}
			);

			// If assigning to a person, also update the person's descriptor if this face has one
			if (personId && updatedFaces[faceIndex].descriptor) {
				const personObjectId = new Types.ObjectId(personId);
				const person = await db.collection('people').findOne({ _id: personObjectId });
				if (person && !person.faceRecognition?.descriptor) {
					// Only update if person doesn't have a descriptor yet
					await db.collection('people').updateOne(
						{ _id: personObjectId },
						{
							$set: {
								'faceRecognition.descriptor': updatedFaces[faceIndex].descriptor,
							},
						}
					);
				}
			}

			return {
				success: true,
				data: {
					faceIndex,
					personId,
				},
			};
		} catch (error) {
			console.error('Failed to assign face:', error);
			if (error instanceof BadRequestException || error instanceof NotFoundException) {
				throw error;
			}
			throw new Error(
				`Failed to assign face: ${error instanceof Error ? error.message : 'Unknown error'}`
			);
		}
	}
}
