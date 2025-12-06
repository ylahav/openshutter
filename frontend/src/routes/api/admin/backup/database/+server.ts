import { json } from '@sveltejs/kit';
import type { RequestHandler } from './$types';
import { connectToDatabase } from '$lib/mongodb';

export const POST: RequestHandler = async ({ locals }) => {
	try {
		// Require admin access
		if (!locals.user || locals.user.role !== 'admin') {
			return json({ success: false, error: 'Unauthorized' }, { status: 401 });
		}

		const { db } = await connectToDatabase();

		// Get all collections
		const collections = await db.listCollections().toArray();
		const backup: any = {
			timestamp: new Date().toISOString(),
			version: '1.0',
			collections: {}
		};

		// Export each collection
		for (const collectionInfo of collections) {
			const collectionName = collectionInfo.name;
			const collection = db.collection(collectionName);
			const documents = await collection.find({}).toArray();

			// Convert ObjectId to string for JSON serialization
			const serializedDocuments = documents.map((doc: any) => ({
				...doc,
				_id: doc._id.toString()
			}));

			backup.collections[collectionName] = serializedDocuments;
		}

		return json({
			success: true,
			backup,
			message: `Backup created with ${Object.keys(backup.collections).length} collections`
		});
	} catch (error) {
		console.error('Database backup error:', error);
		const errorMessage = error instanceof Error ? error.message : String(error);
		return json(
			{ success: false, error: `Failed to create database backup: ${errorMessage}` },
			{ status: 500 }
		);
	}
};
