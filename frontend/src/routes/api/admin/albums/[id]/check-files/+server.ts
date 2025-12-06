import { json } from '@sveltejs/kit';
import type { RequestHandler } from './$types';
import { connectToDatabase } from '$lib/mongodb';
import { ObjectId } from 'mongodb';

export const POST: RequestHandler = async ({ params, request, locals }) => {
	try {
		const { id } = await params;
		const { db } = await connectToDatabase();

		// Get current user for access control
		const user = locals.user
			? {
					id: locals.user._id || locals.user.id,
					email: locals.user.email,
					name: locals.user.name,
					role: locals.user.role || 'guest'
				}
			: null;

		if (!user) {
			return json({ success: false, error: 'Unauthorized' }, { status: 401 });
		}

		// Validate album ID
		if (!id || !ObjectId.isValid(id)) {
			return json({ success: false, error: 'Invalid album ID' }, { status: 400 });
		}

		const body = await request.json();
		const { filenames } = body;

		if (!Array.isArray(filenames)) {
			return json({ success: false, error: 'filenames must be an array' }, { status: 400 });
		}

		// Get album photos - handle both ObjectId and string formats
		const photosCollection = db.collection('photos');
		const objectId = new ObjectId(id);
		const query = {
			$or: [{ albumId: objectId }, { albumId: id }]
		};

		console.log(`Check Files API: Looking for photos with albumId: ${id} or ObjectId: ${objectId}`);
		const albumPhotos = await photosCollection.find(query).toArray();
		console.log(`Check Files API: Found ${albumPhotos.length} photos for album ${id}`);

		// Create a map of normalized originalFilename to photo for lookup
		const uploadedFilenamesMap = new Map<string, any>();
		albumPhotos.forEach((photo) => {
			// Use originalFilename field (this is what we compare against)
			const originalFilename = photo.originalFilename || '';
			if (originalFilename) {
				// Normalize: lowercase and trim
				const normalized = originalFilename.toLowerCase().trim();
				uploadedFilenamesMap.set(normalized, photo);
			}
		});

		// Normalize input filenames and find missing ones
		const missingFiles: Array<{ filename: string; normalized: string }> = [];
		const inputFilenamesSet = new Set<string>();

		filenames.forEach((f: string) => {
			// Extract just the filename from path if it's a full path
			const filename = f.split(/[/\\]/).pop() || f;
			const normalized = filename.toLowerCase().trim();
			inputFilenamesSet.add(normalized);

			// Check if this file is uploaded (compare with originalFilename)
			if (!uploadedFilenamesMap.has(normalized)) {
				missingFiles.push({
					filename: filename, // Keep original case for display
					normalized
				});
			}
		});

		// Find files that are uploaded but not in the local folder
		const extraFiles: Array<{ filename: string; photoId?: string }> = [];
		albumPhotos.forEach((photo) => {
			const originalFilename = photo.originalFilename || '';
			if (originalFilename) {
				const normalized = originalFilename.toLowerCase().trim();
				if (!inputFilenamesSet.has(normalized)) {
					extraFiles.push({
						filename: originalFilename, // Keep original case for display
						photoId: photo._id?.toString()
					});
				}
			}
		});

		return json({
			success: true,
			data: {
				totalLocalFiles: filenames.length,
				totalUploadedFiles: albumPhotos.length,
				missingFiles: missingFiles,
				extraFiles: extraFiles,
				summary: {
					missingCount: missingFiles.length,
					extraCount: extraFiles.length,
					matchingCount: filenames.length - missingFiles.length
				}
			}
		});
	} catch (error) {
		console.error('Check files error:', error);
		const errorMessage = error instanceof Error ? error.message : String(error);
		return json({ success: false, error: `Failed to check files: ${errorMessage}` }, { status: 500 });
	}
};
