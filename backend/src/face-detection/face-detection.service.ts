import { Injectable } from '@nestjs/common';

export interface FaceDetection {
	descriptor: number[];
	box: {
		x: number;
		y: number;
		width: number;
		height: number;
	};
	landmarks?: {
		leftEye: { x: number; y: number };
		rightEye: { x: number; y: number };
		nose: { x: number; y: number };
		mouth: { x: number; y: number };
	};
}

export interface FaceMatch {
	faceIndex: number;
	personId: string | null;
	confidence: number | null;
}

@Injectable()
export class FaceDetectionService {
	private readonly logger = new Logger(FaceDetectionService.name);

	/**
	 * Find best match for a single face descriptor
	 */
	findBestMatch(
		faceDescriptor: number[],
		knownDescriptors: Array<{ personId: string; descriptor: number[] }>,
		threshold: number = 0.6
	): { personId: string; confidence: number } | null {
		let bestMatch: { personId: string; distance: number } | null = null;

		for (const known of knownDescriptors) {
			const distance = this.euclideanDistance(faceDescriptor, known.descriptor);
			const confidence = 1 - distance;

			if (confidence >= threshold) {
				if (!bestMatch || distance < bestMatch.distance) {
					bestMatch = {
						personId: known.personId,
						distance,
					};
				}
			}
		}

		return bestMatch
			? {
					personId: bestMatch.personId,
					confidence: 1 - bestMatch.distance,
				}
			: null;
	}

	/**
	 * Match detected faces with people in the database
	 */
	async matchFaces(
		faces: Array<{ descriptor?: number[]; box: any }>,
		people: Array<{ _id: any; faceRecognition?: { descriptor?: any } }>,
		threshold: number = 0.6
	): Promise<FaceMatch[]> {
		const matches: FaceMatch[] = [];

		// Normalize descriptor to ensure it's a number[] array
		const normalizeDescriptor = (desc: any): number[] | null => {
			if (!desc) return null;

			let normalized: number[];
			if (Array.isArray(desc)) {
				normalized = Array.from(desc).map((n) => {
					const num = typeof n === 'number' ? n : parseFloat(String(n));
					return isNaN(num) ? 0 : num;
				});
			} else if (desc instanceof Float32Array) {
				normalized = Array.from(desc);
			} else if (desc instanceof ArrayBuffer) {
				normalized = Array.from(new Float32Array(desc));
			} else {
				try {
					normalized = Array.from(desc as any);
				} catch {
					return null;
				}
			}

			if (normalized.length !== 128) {
				this.logger.warn(`Descriptor has incorrect length: ${normalized.length}, expected 128`);
				return null;
			}

			return normalized;
		};

		// Prepare known descriptors
		const knownDescriptors = people
			.map((person) => {
				const normalized = normalizeDescriptor(person.faceRecognition?.descriptor);
				return normalized
					? {
							personId: person._id.toString(),
							descriptor: normalized,
						}
					: null;
			})
			.filter((d): d is { personId: string; descriptor: number[] } => d !== null);

		// Match each detected face
		for (let i = 0; i < faces.length; i++) {
			const face = faces[i];
			const faceDescriptor = normalizeDescriptor(face.descriptor);

			if (!faceDescriptor) {
				matches.push({
					faceIndex: i,
					personId: null,
					confidence: null,
				});
				continue;
			}

			// Find best match
			let bestMatch: { personId: string; distance: number } | null = null;

			for (const known of knownDescriptors) {
				const distance = this.euclideanDistance(faceDescriptor, known.descriptor);
				const confidence = 1 - distance; // Convert distance to confidence (lower distance = higher confidence)

				if (confidence >= threshold) {
					if (!bestMatch || distance < bestMatch.distance) {
						bestMatch = {
							personId: known.personId,
							distance,
						};
					}
				}
			}

			matches.push({
				faceIndex: i,
				personId: bestMatch ? bestMatch.personId : null,
				confidence: bestMatch ? 1 - bestMatch.distance : null,
			});
		}

		return matches;
	}

	/**
	 * Calculate Euclidean distance between two face descriptors
	 */
	private euclideanDistance(descriptor1: number[], descriptor2: number[]): number {
		if (descriptor1.length !== descriptor2.length) {
			throw new Error('Descriptors must have the same length');
		}

		let sum = 0;
		for (let i = 0; i < descriptor1.length; i++) {
			const diff = descriptor1[i] - descriptor2[i];
			sum += diff * diff;
		}

		return Math.sqrt(sum);
	}
}
