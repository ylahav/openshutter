import { json } from '@sveltejs/kit';
import type { RequestHandler } from './$types';
import { connectToDatabase } from '$lib/mongodb';
import { TagModel } from '$lib/models/Tag';
import { ObjectId } from 'mongodb';

export const GET: RequestHandler = async ({ params, locals }) => {
	try {
		// Require admin access
		if (!locals.user || locals.user.role !== 'admin') {
			return json({ success: false, error: 'Unauthorized' }, { status: 401 });
		}

		const { id } = await params;
		const { db } = await connectToDatabase();

		// Validate ObjectId
		if (!ObjectId.isValid(id)) {
			return json({ success: false, error: 'Invalid tag ID' }, { status: 400 });
		}

		const tag = await TagModel.findById(id).lean();

		if (!tag) {
			return json({ success: false, error: 'Tag not found' }, { status: 404 });
		}

		return json({
			success: true,
			data: tag
		});
	} catch (error) {
		console.error('Get tag error:', error);
		return json({ success: false, error: 'Failed to fetch tag' }, { status: 500 });
	}
};

export const PUT: RequestHandler = async ({ params, request, locals }) => {
	try {
		// Require admin access
		if (!locals.user || locals.user.role !== 'admin') {
			return json({ success: false, error: 'Unauthorized' }, { status: 401 });
		}

		const { id } = await params;
		const { db } = await connectToDatabase();
		const body = await request.json();
		const { name, description, color, category, isActive } = body;

		// Validate ObjectId
		if (!ObjectId.isValid(id)) {
			return json({ success: false, error: 'Invalid tag ID' }, { status: 400 });
		}

		// Validate required fields
		if (!name) {
			return json({ success: false, error: 'Tag name is required' }, { status: 400 });
		}

		// Check if tag exists
		const existingTag = await TagModel.findById(id);
		if (!existingTag) {
			return json({ success: false, error: 'Tag not found' }, { status: 404 });
		}

		// Check if another tag with same name exists (excluding current tag)
		const duplicateTag = await TagModel.findOne({
			name: name.trim(),
			_id: { $ne: id }
		});

		if (duplicateTag) {
			return json(
				{ success: false, error: 'Tag with this name already exists' },
				{ status: 409 }
			);
		}

		// Update tag
		const updatedTag = await TagModel.findByIdAndUpdate(
			id,
			{
				name: name.trim(),
				description: description?.trim(),
				color: color || '#3B82F6',
				category: category || 'general',
				isActive: isActive !== undefined ? isActive : true
			},
			{ new: true, runValidators: true }
		);

		return json({
			success: true,
			data: updatedTag
		});
	} catch (error) {
		console.error('Update tag error:', error);
		return json({ success: false, error: 'Failed to update tag' }, { status: 500 });
	}
};

export const DELETE: RequestHandler = async ({ params, locals }) => {
	try {
		// Require admin access
		if (!locals.user || locals.user.role !== 'admin') {
			return json({ success: false, error: 'Unauthorized' }, { status: 401 });
		}

		const { id } = await params;
		const { db } = await connectToDatabase();

		// Validate ObjectId
		if (!ObjectId.isValid(id)) {
			return json({ success: false, error: 'Invalid tag ID' }, { status: 400 });
		}

		// Check if tag exists
		const tag = await TagModel.findById(id);
		if (!tag) {
			return json({ success: false, error: 'Tag not found' }, { status: 404 });
		}

		// Check if tag is referenced in any photos
		const photoCount = await db.collection('photos').countDocuments({
			tags: new ObjectId(id)
		});

		if (photoCount > 0) {
			return json(
				{
					success: false,
					error: `Cannot delete tag. It is referenced in ${photoCount} photo(s). Please remove it from photos first.`
				},
				{ status: 409 }
			);
		}

		// Delete tag
		await TagModel.findByIdAndDelete(id);

		return json({
			success: true,
			message: 'Tag deleted successfully'
		});
	} catch (error) {
		console.error('Delete tag error:', error);
		return json({ success: false, error: 'Failed to delete tag' }, { status: 500 });
	}
};

