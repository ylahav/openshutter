import { json } from '@sveltejs/kit';
import type { RequestHandler } from './$types';
import { connectToDatabase, connectMongoose } from '$lib/mongodb';
import { PageModel } from '$lib/models/Page';
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
		const category = searchParams.get('category');
		const published = searchParams.get('published');
		const page = parseInt(searchParams.get('page') || '1');
		const limit = parseInt(searchParams.get('limit') || '100');

		// Build query
		const query: any = {};

		if (search) {
			// Search in alias and multi-language title/subtitle fields
			const searchRegex = { $regex: search, $options: 'i' };
			const langs = SUPPORTED_LANGUAGES.map((l) => l.code);
			query.$or = [
				{ alias: searchRegex },
				{ title: searchRegex },
				{ subtitle: searchRegex },
				// Multi-language fields
				...langs.map((code) => ({ [`title.${code}`]: searchRegex })),
				...langs.map((code) => ({ [`subtitle.${code}`]: searchRegex }))
			];
		}

		if (category) {
			query.category = category;
		}

		if (published !== null && published !== undefined) {
			query.isPublished = published === 'true';
		}

		// Get pages with pagination
		const skip = (page - 1) * limit;
		const [pages, total] = await Promise.all([
			PageModel.find(query).sort({ createdAt: -1 }).skip(skip).limit(limit).lean(),
			PageModel.countDocuments(query)
		]);

		// Normalize _id to string
		const data = pages.map((page: any) => ({
			...page,
			_id: String(page._id)
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
		console.error('Admin Pages API error:', error);
		return json({ success: false, error: 'Failed to fetch pages' }, { status: 500 });
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
		const { title, subtitle, alias, leadingImage, introText, content, category, isPublished } = body;

		// Validate required fields
		if (!title || !alias || !category) {
			return json(
				{ success: false, error: 'title, alias, and category are required' },
				{ status: 400 }
			);
		}

		// Check if alias already exists
		const existingPage = await PageModel.findOne({ alias: alias.trim() });
		if (existingPage) {
			return json({ success: false, error: 'Page with this alias already exists' }, { status: 400 });
		}

		// Clean and normalize multi-language fields
		const cleanTitle = MultiLangUtils.clean(title);
		const cleanSubtitle = subtitle ? MultiLangUtils.clean(subtitle) : undefined;
		const cleanIntroText = introText ? MultiLangUtils.clean(introText) : undefined;
		const cleanContent = content ? MultiLangUtils.clean(content) : undefined;

		// Ensure title is not empty after cleaning
		if (!cleanTitle || Object.keys(cleanTitle).length === 0) {
			return json({ success: false, error: 'Page title is required in at least one language' }, { status: 400 });
		}

		// Create page
		const now = new Date();
		const page = new PageModel({
			title: cleanTitle,
			subtitle: cleanSubtitle,
			alias: alias.trim(),
			leadingImage: leadingImage || undefined,
			introText: cleanIntroText,
			content: cleanContent,
			category: category,
			isPublished: isPublished ?? false,
			createdBy: locals.user.id || String(locals.user._id),
			updatedBy: locals.user.id || String(locals.user._id)
		});

		await page.save();

		// Return page with normalized _id
		const pageObj = page.toObject();
		return json(
			{
				success: true,
				data: { ...pageObj, _id: String(page._id) }
			},
			{ status: 201 }
		);
	} catch (error) {
		console.error('Create page error:', error);
		const errorMessage = error instanceof Error ? error.message : String(error);
		return json({ success: false, error: `Failed to create page: ${errorMessage}` }, { status: 500 });
	}
};

