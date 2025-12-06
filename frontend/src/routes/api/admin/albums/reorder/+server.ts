import { json } from '@sveltejs/kit';
import type { RequestHandler } from './$types';
import { connectToDatabase } from '$lib/mongodb';
import { ObjectId } from 'mongodb';

export const PUT: RequestHandler = async ({ request, locals }) => {
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

		const { db } = await connectToDatabase();
		const body = await request.json();
		const updates = (body?.updates || []) as Array<{
			id: string;
			parentAlbumId: string | null;
			order: number;
		}>;

		if (!Array.isArray(updates) || updates.length === 0) {
			return json({ success: false, error: 'No updates provided' }, { status: 400 });
		}

		const bulk = db.collection('albums').initializeUnorderedBulkOp();
		for (const u of updates) {
			const filter = { _id: new ObjectId(u.id) };
			const $set: any = { order: u.order };
			if (u.parentAlbumId === null) {
				$set.parentAlbumId = null;
			}
			bulk.find(filter).updateOne({ $set });
		}
		await bulk.execute();
		return json({ success: true });
	} catch (error) {
		console.error('Failed to reorder albums:', error);
		const errorMessage = error instanceof Error ? error.message : String(error);
		return json({ success: false, error: `Failed to reorder albums: ${errorMessage}` }, { status: 500 });
	}
};

