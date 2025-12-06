import { json } from '@sveltejs/kit';
import type { RequestHandler } from './$types';
import { connectToDatabase, connectMongoose } from '$lib/mongodb';
import { BlogCategoryModel } from '$lib/models/BlogCategory';
import { MultiLangUtils } from '$lib/utils/multiLang';
import slugify from 'slugify';
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
			return json({ success: false, error: 'Invalid category ID' }, { status: 400 });
		}

		const category = await BlogCategoryModel.findById(id).lean();

		if (!category) {
			return json({ success: false, error: 'Category not found' }, { status: 404 });
		}

		// Normalize _id to string
		return json({
			success: true,
			data: { ...category, _id: String(category._id) }
		});
	} catch (error) {
		console.error('Get blog category error:', error);
		return json({ success: false, error: 'Failed to fetch blog category' }, { status: 500 });
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
			return json({ success: false, error: 'Invalid category ID' }, { status: 400 });
		}

		const body = await request.json();
		const { title, description, leadingImage, isActive, sortOrder } = body;

		// Validate required fields
		if (!title) {
			return json({ success: false, error: 'Title is required' }, { status: 400 });
		}

		const _id = new ObjectId(id);
		const existingCategory = await BlogCategoryModel.findById(_id).lean();

		if (!existingCategory) {
			return json({ success: false, error: 'Category not found' }, { status: 404 });
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

		// Update alias if title changes
		const titleText =
			typeof title === 'string'
				? title
				: typeof title === 'object' && title !== null
					? title.en || title.he || 'untitled'
					: 'untitled';
		const newAlias = slugify(titleText, { lower: true, strict: true });
		let uniqueAlias = newAlias;

		if (newAlias !== existingCategory.alias) {
			let counter = 1;
			while (await BlogCategoryModel.findOne({ alias: uniqueAlias, _id: { $ne: _id } })) {
				uniqueAlias = `${newAlias}-${counter}`;
				counter++;
			}
		}

		// Build update object
		const update: any = {
			alias: uniqueAlias,
			title: cleanTitle,
			updatedAt: new Date()
		};

		if (description !== undefined) {
			update.description = cleanDescription;
		}

		if (leadingImage !== undefined) {
			update.leadingImage = leadingImage || undefined;
		}

		if (isActive !== undefined) {
			update.isActive = isActive;
		}

		if (sortOrder !== undefined) {
			update.sortOrder = sortOrder;
		}

		// Update category
		const result = await BlogCategoryModel.findByIdAndUpdate(_id, { $set: update }, { new: true }).lean();

		if (!result) {
			return json({ success: false, error: 'Failed to update category' }, { status: 500 });
		}

		// Normalize _id to string
		return json({
			success: true,
			data: { ...result, _id: String(result._id) },
			message: 'Blog category updated successfully'
		});
	} catch (error) {
		console.error('Update blog category error:', error);
		const errorMessage = error instanceof Error ? error.message : String(error);
		return json(
			{ success: false, error: `Failed to update blog category: ${errorMessage}` },
			{ status: 500 }
		);
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
			return json({ success: false, error: 'Invalid category ID' }, { status: 400 });
		}

		const _id = new ObjectId(id);

		// Delete category
		const result = await BlogCategoryModel.findByIdAndDelete(_id);

		if (!result) {
			return json({ success: false, error: 'Category not found' }, { status: 404 });
		}

		return json({
			success: true,
			message: 'Blog category deleted successfully'
		});
	} catch (error) {
		console.error('Delete blog category error:', error);
		const errorMessage = error instanceof Error ? error.message : String(error);
		return json(
			{ success: false, error: `Failed to delete blog category: ${errorMessage}` },
			{ status: 500 }
		);
	}
};
