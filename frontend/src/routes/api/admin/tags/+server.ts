import { json } from '@sveltejs/kit';
import type { RequestHandler } from './$types';
import { connectToDatabase, connectMongoose } from '$lib/mongodb';
import { TagModel } from '$lib/models/Tag';
import { SUPPORTED_LANGUAGES } from '$lib/types/multi-lang';
import { ObjectId } from 'mongodb';

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
		const limit = parseInt(searchParams.get('limit') || '20');
		const category = searchParams.get('category');
		const isActive = searchParams.get('isActive');
		const sortBy = searchParams.get('sortBy') || 'usageCount';
		const sortOrder = searchParams.get('sortOrder') || 'desc';

		// Build query
		const query: any = {};

		if (search) {
			// Support search in both string and multi-language fields
			const langs = SUPPORTED_LANGUAGES.map((l) => l.code);
			const searchConditions = [
				// String fields (backward compatibility)
				{ name: { $regex: search, $options: 'i' } },
				{ description: { $regex: search, $options: 'i' } },
				// Multi-language fields
				...langs.map((code) => ({ [`name.${code}`]: { $regex: search, $options: 'i' } })),
				...langs.map((code) => ({ [`description.${code}`]: { $regex: search, $options: 'i' } }))
			];
			query.$or = searchConditions;
		}

		if (category) {
			query.category = category;
		}

		if (isActive !== null) {
			query.isActive = isActive === 'true';
		}

		// Build sort object
		const sort: any = {};
		sort[sortBy] = sortOrder === 'asc' ? 1 : -1;

		// Get tags with pagination (admin sees all tags, no public filtering)
		const skip = (page - 1) * limit;
		const [tags, total] = await Promise.all([
			TagModel.find(query).sort(sort).skip(skip).limit(limit).lean(),
			TagModel.countDocuments(query)
		]);

		return json({
			success: true,
			data: tags,
			pagination: {
				page,
				limit,
				total,
				pages: Math.ceil(total / limit)
			}
		});
	} catch (error) {
		console.error('Admin Tags API error:', error);
		return json({ success: false, error: 'Failed to fetch tags' }, { status: 500 });
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
		const { name, description, color, category } = body;

		// Debug: log what we received
		console.log('Received tag data:', { name, description, color, category });
		console.log('Name type:', typeof name, 'Is object:', typeof name === 'object', 'Is string:', typeof name === 'string');

		// Validate required fields - support both string and multi-language
		const hasAnyName =
			typeof name === 'string'
				? !!name.trim()
				: name && typeof name === 'object'
					? Object.values(name as Record<string, any>).some((v) => typeof v === 'string' && v.trim().length > 0)
					: false;
		if (!hasAnyName) {
			return json({ success: false, error: 'Tag name is required' }, { status: 400 });
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

		// Ensure nameObj is not empty and all values are strings
		if (!nameObj || Object.keys(nameObj).length === 0) {
			return json({ success: false, error: 'Tag name is required in at least one language' }, { status: 400 });
		}

		// Validate that all values in nameObj are strings
		for (const [key, value] of Object.entries(nameObj)) {
			if (typeof value !== 'string') {
				console.error(`Invalid name value for language ${key}:`, value, typeof value);
				return json({ success: false, error: `Invalid name value for language ${key}` }, { status: 400 });
			}
		}

		console.log('Final nameObj:', nameObj);

		// Convert description to multi-language format if it's a string
		// Filter out empty strings to keep only languages with actual content
		const descriptionObj = description
			? typeof description === 'string'
				? { en: description.trim() }
				: Object.fromEntries(
						SUPPORTED_LANGUAGES.map((l) => {
							const val = (description as any)?.[l.code];
							return [l.code, typeof val === 'string' ? val.trim() : ''];
						})
							.filter(([_, value]) => value && typeof value === 'string' && value.trim().length > 0)
					)
			: undefined;

		// Check if tag already exists (check by any language name)
		const nameConditions = SUPPORTED_LANGUAGES.map((l) => ({
			[`name.${l.code}`]: (nameObj as any)[l.code]
		})).filter((cond) => Object.values(cond)[0]);
		
		// Also check old string format for backward compatibility
		const existingTagQuery: any = {
			$or: [
				...(nameConditions.length ? nameConditions : []),
				// Backward compatibility: check string name
				...(typeof name === 'string' ? [{ name: name.trim() }] : [])
			]
		};

		const existingTag = await TagModel.findOne(existingTagQuery);

		if (existingTag) {
			return json(
				{ success: false, error: 'Tag with this name already exists' },
				{ status: 409 }
			);
		}

		// Create new tag - ensure nameObj is a plain object with only string values
		const cleanNameObj: Record<string, string> = {};
		for (const [key, value] of Object.entries(nameObj)) {
			if (typeof value === 'string' && value.trim().length > 0) {
				cleanNameObj[key] = value.trim();
			}
		}

		if (Object.keys(cleanNameObj).length === 0) {
			return json({ success: false, error: 'Tag name is required in at least one language' }, { status: 400 });
		}

		console.log('Creating tag with cleanNameObj:', cleanNameObj);

		const tag = new TagModel({
			name: cleanNameObj,
			description: descriptionObj,
			color: color || '#3B82F6',
			category: category || 'general',
			createdBy: locals.user.id
		});

		await tag.save();

		return json({
			success: true,
			data: tag
		});
	} catch (error) {
		console.error('Create tag error:', error);
		const errorMessage = error instanceof Error ? error.message : String(error);
		return json({ success: false, error: `Failed to create tag: ${errorMessage}` }, { status: 500 });
	}
};
