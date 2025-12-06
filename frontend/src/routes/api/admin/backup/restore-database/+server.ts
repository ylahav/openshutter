import { json } from '@sveltejs/kit';
import type { RequestHandler } from './$types';
import { connectToDatabase } from '$lib/mongodb';
import { ObjectId } from 'mongodb';

export const POST: RequestHandler = async ({ request, locals }) => {
	try {
		// Require admin access
		if (!locals.user || locals.user.role !== 'admin') {
			return json({ success: false, error: 'Unauthorized' }, { status: 401 });
		}

		const body = await request.json();
		const { backup } = body;

		if (!backup || !backup.collections) {
			return json({ success: false, error: 'Invalid backup format' }, { status: 400 });
		}

		const { db } = await connectToDatabase();

		// Clear existing collections
		const existingCollections = await db.listCollections().toArray();
		for (const collectionInfo of existingCollections) {
			await db.collection(collectionInfo.name).deleteMany({});
		}

		// Restore each collection
		const restoredCollections: string[] = [];
		for (const [collectionName, documents] of Object.entries(backup.collections)) {
			if (Array.isArray(documents)) {
				// Convert string IDs back to ObjectId
				const documentsWithObjectIds = documents.map((doc: any) => ({
					...doc,
					_id: new ObjectId(doc._id)
				}));

				if (documentsWithObjectIds.length > 0) {
					await db.collection(collectionName).insertMany(documentsWithObjectIds);
					restoredCollections.push(collectionName);
				}
			}
		}

		return json({
			success: true,
			message: `Database restored successfully. Restored ${restoredCollections.length} collections: ${restoredCollections.join(', ')}`
		});
	} catch (error) {
		console.error('Database restore error:', error);
		const errorMessage = error instanceof Error ? error.message : String(error);
		return json(
			{ success: false, error: `Failed to restore database: ${errorMessage}` },
			{ status: 500 }
		);
	}
};
