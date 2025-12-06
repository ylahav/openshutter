import { json } from '@sveltejs/kit';
import type { RequestHandler } from './$types';
import { connectToDatabase, connectMongoose } from '$lib/mongodb';
import { PageModel } from '$lib/models/Page';
import { MultiLangUtils } from '$lib/utils/multiLang';
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
			return json({ success: false, error: 'Invalid page ID' }, { status: 400 });
		}

		const page = await PageModel.findById(id).lean();

		if (!page) {
			return json({ success: false, error: 'Page not found' }, { status: 404 });
		}

		// Normalize _id to string
		return json({
			success: true,
			data: { ...page, _id: String(page._id) }
		});
	} catch (error) {
		console.error('Get page error:', error);
		return json({ success: false, error: 'Failed to fetch page' }, { status: 500 });
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
			return json({ success: false, error: 'Invalid page ID' }, { status: 400 });
		}

		const body = await request.json();
		const { title, subtitle, alias, leadingImage, introText, content, category, isPublished } = body;

		// Check if alias already exists (excluding current page)
		if (alias) {
			const existingPage = await PageModel.findOne({
				alias: alias.trim(),
				_id: { $ne: new ObjectId(id) }
			});
			if (existingPage) {
				return json({ success: false, error: 'Page with this alias already exists' }, { status: 400 });
			}
		}

		// Build update object
		const update: any = {
			updatedAt: new Date(),
			updatedBy: locals.user.id || String(locals.user._id)
		};

		if (title !== undefined) {
			const cleanTitle = MultiLangUtils.clean(title);
			if (!cleanTitle || Object.keys(cleanTitle).length === 0) {
				return json(
					{ success: false, error: 'Page title is required in at least one language' },
					{ status: 400 }
				);
			}
			update.title = cleanTitle;
		}

		if (subtitle !== undefined) {
			update.subtitle = subtitle ? MultiLangUtils.clean(subtitle) : undefined;
		}

		if (alias !== undefined) {
			update.alias = alias.trim();
		}

		if (leadingImage !== undefined) {
			update.leadingImage = leadingImage || undefined;
		}

		if (introText !== undefined) {
			update.introText = introText ? MultiLangUtils.clean(introText) : undefined;
		}

		if (content !== undefined) {
			update.content = content ? MultiLangUtils.clean(content) : undefined;
		}

		if (category !== undefined) {
			update.category = category;
		}

		if (isPublished !== undefined) {
			update.isPublished = isPublished;
		}

		// Update page
		const _id = new ObjectId(id);
		const result = await PageModel.findByIdAndUpdate(_id, { $set: update }, { new: true }).lean();

		if (!result) {
			return json({ success: false, error: 'Page not found' }, { status: 404 });
		}

		// Normalize _id to string
		return json({
			success: true,
			data: { ...result, _id: String(result._id) }
		});
	} catch (error) {
		console.error('Update page error:', error);
		const errorMessage = error instanceof Error ? error.message : String(error);
		return json({ success: false, error: `Failed to update page: ${errorMessage}` }, { status: 500 });
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
			return json({ success: false, error: 'Invalid page ID' }, { status: 400 });
		}

		const _id = new ObjectId(id);

		// Delete page
		const result = await PageModel.findByIdAndDelete(_id);

		if (!result) {
			return json({ success: false, error: 'Page not found' }, { status: 404 });
		}

		return json({ success: true, message: 'Page deleted successfully' });
	} catch (error) {
		console.error('Delete page error:', error);
		const errorMessage = error instanceof Error ? error.message : String(error);
		return json({ success: false, error: `Failed to delete page: ${errorMessage}` }, { status: 500 });
	}
};

