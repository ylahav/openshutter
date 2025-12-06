import { json } from '@sveltejs/kit';
import type { RequestHandler } from './$types';
import { connectToDatabase, connectMongoose } from '$lib/mongodb';
import { GroupModel } from '$lib/models/Group';
import { SUPPORTED_LANGUAGES } from '$lib/types/multi-lang';
import { MultiLangUtils } from '$lib/utils/multiLang';

export const GET: RequestHandler = async ({ url, locals }) => {
	try {
		// Require admin access
		if (!locals.user || locals.user.role !== 'admin') {
			return json({ success: false, error: 'Unauthorized' }, { status: 401 });
		}

		await connectMongoose();
		const { db } = await connectToDatabase();
		const searchParams = url.searchParams;

		// Get query parameters
		const search = searchParams.get('search');
		const page = parseInt(searchParams.get('page') || '1');
		const limit = parseInt(searchParams.get('limit') || '100');

		// Build query
		const query: any = {};

		if (search) {
			// Search in alias and name fields (name can be string or multi-language object)
			const searchRegex = { $regex: search, $options: 'i' };
			const langs = SUPPORTED_LANGUAGES.map((l) => l.code);
			query.$or = [
				{ alias: searchRegex },
				{ name: searchRegex },
				// Multi-language name fields
				...langs.map((code) => ({ [`name.${code}`]: searchRegex }))
			];
		}

		// Get groups with pagination
		const skip = (page - 1) * limit;
		const [groups, total] = await Promise.all([
			GroupModel.find(query).sort({ alias: 1 }).skip(skip).limit(limit).lean(),
			GroupModel.countDocuments(query)
		]);

		// Normalize _id to string
		const data = groups.map((group: any) => ({
			...group,
			_id: String(group._id)
		}));

		return json({
			success: true,
			data,
			pagination: {
				page,
				limit,
				total,
				pages: Math.ceil(total / limit)
			}
		});
	} catch (error) {
		console.error('Admin Groups API error:', error);
		return json({ success: false, error: 'Failed to fetch groups' }, { status: 500 });
	}
};

export const POST: RequestHandler = async ({ request, locals }) => {
	try {
		// Require admin access
		if (!locals.user || locals.user.role !== 'admin') {
			return json({ success: false, error: 'Unauthorized' }, { status: 401 });
		}

		await connectMongoose();
		const { db } = await connectToDatabase();
		const body = await request.json();
		const { alias, name } = body;

		// Validate required fields
		if (!alias || !name) {
			return json({ success: false, error: 'alias and name are required' }, { status: 400 });
		}

		// Normalize alias
		const normalizedAlias = String(alias).trim().toLowerCase();

		// Check if alias already exists
		const existingGroup = await GroupModel.findOne({ alias: normalizedAlias });
		if (existingGroup) {
			return json({ success: false, error: 'Alias already exists' }, { status: 409 });
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

		// Create group
		const now = new Date();
		const group = new GroupModel({
			alias: normalizedAlias,
			name: nameObj,
			createdAt: now,
			updatedAt: now
		});

		await group.save();

		// Return group with normalized _id
		const groupObj = group.toObject();
		return json(
			{
				success: true,
				data: { ...groupObj, _id: String(group._id) }
			},
			{ status: 201 }
		);
	} catch (error) {
		console.error('Create group error:', error);
		const errorMessage = error instanceof Error ? error.message : String(error);
		return json({ success: false, error: `Failed to create group: ${errorMessage}` }, { status: 500 });
	}
};

