import { json } from '@sveltejs/kit';
import type { RequestHandler } from './$types';
import { connectToDatabase, connectMongoose } from '$lib/mongodb';
import { BlogCategoryModel } from '$lib/models/BlogCategory';
import { SUPPORTED_LANGUAGES } from '$lib/types/multi-lang';
import { MultiLangUtils } from '$lib/utils/multiLang';
import slugify from 'slugify';
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
		const q = searchParams.get('q') || searchParams.get('search') || '';
		const isActive = searchParams.get('isActive');
		const page = parseInt(searchParams.get('page') || '1');
		const limit = parseInt(searchParams.get('limit') || '10');

		// Build query
		const query: any = {};

		if (q) {
			// Search in alias and multi-language title/description fields
			const searchRegex = { $regex: q, $options: 'i' };
			const langs = SUPPORTED_LANGUAGES.map((l) => l.code);
			query.$or = [
				{ alias: searchRegex },
				// Multi-language fields
				...langs.map((code) => ({ [`title.${code}`]: searchRegex })),
				...langs.map((code) => ({ [`description.${code}`]: searchRegex }))
			];
		}

		if (isActive !== null && isActive !== undefined) {
			query.isActive = isActive === 'true';
		}

		// Get categories with pagination
		const skip = (page - 1) * limit;
		const [categories, total] = await Promise.all([
			BlogCategoryModel.find(query)
				.sort({ sortOrder: 1, createdAt: -1 })
				.skip(skip)
				.limit(limit)
				.lean(),
			BlogCategoryModel.countDocuments(query)
		]);

		// Normalize _id to string
		const data = categories.map((category: any) => ({
			...category,
			_id: String(category._id)
		}));

		return json({
			success: true,
			data,
			pagination: {
				page,
				limit,
				total,
				totalPages: Math.ceil(total / limit)
			}
		});
	} catch (error) {
		console.error('Admin Blog Categories API error:', error);
		return json({ success: false, error: 'Failed to fetch blog categories' }, { status: 500 });
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
		const { title, description, leadingImage, isActive, sortOrder } = body;

		// Validate required fields
		if (!title) {
			return json({ success: false, error: 'Title is required' }, { status: 400 });
		}

		// Clean and normalize multi-language fields
		const cleanTitle = MultiLangUtils.clean(title);
		const cleanDescription = description ? MultiLangUtils.clean(description) : undefined;

		// Ensure title is not empty after cleaning
		if (!cleanTitle || Object.keys(cleanTitle).length === 0) {
			return json(
				{ success: false, error: 'Title is required in at least one language' },
				{ status: 400 }
			);
		}

		// Generate alias from title
		const titleText =
			typeof title === 'string'
				? title
				: typeof title === 'object' && title !== null
					? title.en || title.he || 'untitled'
					: 'untitled';
		const generatedAlias = slugify(titleText, { lower: true, strict: true });

		// Ensure alias is unique
		let uniqueAlias = generatedAlias;
		let counter = 1;
		while (await BlogCategoryModel.findOne({ alias: uniqueAlias })) {
			uniqueAlias = `${generatedAlias}-${counter}`;
			counter++;
		}

		// Create category
		const now = new Date();
		const category = new BlogCategoryModel({
			alias: uniqueAlias,
			title: cleanTitle,
			description: cleanDescription,
			leadingImage: leadingImage || undefined,
			isActive: isActive !== undefined ? isActive : true,
			sortOrder: sortOrder || 0,
			createdAt: now,
			updatedAt: now
		});

		await category.save();

		// Return category with normalized _id
		const categoryObj = category.toObject();
		return json(
			{
				success: true,
				data: { ...categoryObj, _id: String(category._id) },
				message: 'Blog category created successfully'
			},
			{ status: 201 }
		);
	} catch (error) {
		console.error('Create blog category error:', error);
		const errorMessage = error instanceof Error ? error.message : String(error);
		return json(
			{ success: false, error: `Failed to create blog category: ${errorMessage}` },
			{ status: 500 }
		);
	}
};

