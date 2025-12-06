import { json } from '@sveltejs/kit';
import type { RequestHandler } from './$types';
import { connectToDatabase, connectMongoose } from '$lib/mongodb';
import { GroupModel } from '$lib/models/Group';
import { SUPPORTED_LANGUAGES } from '$lib/types/multi-lang';
import { ObjectId } from 'mongodb';

export const GET: RequestHandler = async ({ params, locals }) => {
	try {
		// Require admin access
		if (!locals.user || locals.user.role !== 'admin') {
			return json({ success: false, error: 'Unauthorized' }, { status: 401 });
		}

		const { id } = await params;
		await connectMongoose();
		const { db } = await connectToDatabase();

		// Validate ObjectId
		if (!ObjectId.isValid(id)) {
			return json({ success: false, error: 'Invalid group ID' }, { status: 400 });
		}

		const group = await GroupModel.findById(id).lean();

		if (!group) {
			return json({ success: false, error: 'Group not found' }, { status: 404 });
		}

		// Normalize _id to string
		return json({
			success: true,
			data: { ...group, _id: String(group._id) }
		});
	} catch (error) {
		console.error('Get group error:', error);
		return json({ success: false, error: 'Failed to fetch group' }, { status: 500 });
	}
};

export const PUT: RequestHandler = async ({ params, request, locals }) => {
	try {
		// Require admin access
		if (!locals.user || locals.user.role !== 'admin') {
			return json({ success: false, error: 'Unauthorized' }, { status: 401 });
		}

		const { id } = await params;
		await connectMongoose();
		const { db } = await connectToDatabase();

		// Validate ObjectId
		if (!ObjectId.isValid(id)) {
			return json({ success: false, error: 'Invalid group ID' }, { status: 400 });
		}

		const body = await request.json();
		const { name } = body;

		// Validate required fields
		if (!name) {
			return json({ success: false, error: 'name is required' }, { status: 400 });
		}

		// Convert name to multi-language format if it's a string
		// Filter out empty strings to keep only languages with actual content
		const nameObj =
			typeof name === 'string'
				? { en: name.trim() }
				: Object.fromEntries(
						SUPPORTED_LANGUAGES.map((l) => {
							const val = (name as any)?.[l.code];
							return [l.code, typeof val === 'string' ? val.trim() : ''];
						})
							.filter(([_, value]) => value && typeof value === 'string' && value.trim().length > 0)
					);

		// Ensure nameObj is not empty
		if (!nameObj || Object.keys(nameObj).length === 0) {
			return json({ success: false, error: 'Group name is required in at least one language' }, { status: 400 });
		}

		// Update group
		const _id = new ObjectId(id);
		const result = await GroupModel.findByIdAndUpdate(
			_id,
			{ $set: { name: nameObj, updatedAt: new Date() } },
			{ new: true }
		).lean();

		if (!result) {
			return json({ success: false, error: 'Group not found' }, { status: 404 });
		}

		// Normalize _id to string
		return json({
			success: true,
			data: { ...result, _id: String(result._id) }
		});
	} catch (error) {
		console.error('Update group error:', error);
		const errorMessage = error instanceof Error ? error.message : String(error);
		return json({ success: false, error: `Failed to update group: ${errorMessage}` }, { status: 500 });
	}
};

export const DELETE: RequestHandler = async ({ params, locals }) => {
	try {
		// Require admin access
		if (!locals.user || locals.user.role !== 'admin') {
			return json({ success: false, error: 'Unauthorized' }, { status: 401 });
		}

		const { id } = await params;
		await connectMongoose();
		const { db } = await connectToDatabase();

		// Validate ObjectId
		if (!ObjectId.isValid(id)) {
			return json({ success: false, error: 'Invalid group ID' }, { status: 400 });
		}

		const _id = new ObjectId(id);

		// Delete group
		const result = await GroupModel.findByIdAndDelete(_id);

		if (!result) {
			return json({ success: false, error: 'Group not found' }, { status: 404 });
		}

		return json({ success: true });
	} catch (error) {
		console.error('Delete group error:', error);
		const errorMessage = error instanceof Error ? error.message : String(error);
		return json({ success: false, error: `Failed to delete group: ${errorMessage}` }, { status: 500 });
	}
};

