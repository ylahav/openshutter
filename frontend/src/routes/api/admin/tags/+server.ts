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

		// Validate required fields - support both string and multi-language
		const hasAnyName =
			typeof name === 'string'
				? !!name.trim()
				: Object.values((name as Record<string, string>) || {}).some((v) => (v || '').trim());
		if (!hasAnyName) {
			return json({ success: false, error: 'Tag name is required' }, { status: 400 });
		}

		// Convert name to multi-language format if it's a string
		const nameObj =
			typeof name === 'string'
				? { en: name.trim() }
				: Object.fromEntries(
						SUPPORTED_LANGUAGES.map((l) => [l.code, (name as any)[l.code]?.trim() || ''])
					);

		// Convert description to multi-language format if it's a string
		const descriptionObj = description
			? typeof description === 'string'
				? { en: description.trim() }
				: Object.fromEntries(
						SUPPORTED_LANGUAGES.map((l) => [l.code, (description as any)[l.code]?.trim() || ''])
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

		// Create new tag
		const tag = new TagModel({
			name: nameObj,
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
		return json({ success: false, error: 'Failed to create tag' }, { status: 500 });
	}
};
