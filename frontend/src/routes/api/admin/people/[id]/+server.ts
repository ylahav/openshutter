import { json } from '@sveltejs/kit';
import type { RequestHandler } from './$types';
import { connectToDatabase, connectMongoose } from '$lib/mongodb';
import { PersonModel } from '$lib/models/Person';
import { TagModel } from '$lib/models/Tag';
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
			return json({ success: false, error: 'Invalid person ID' }, { status: 400 });
		}

		const person = await PersonModel.findById(id).lean();

		if (!person) {
			return json({ success: false, error: 'Person not found' }, { status: 404 });
		}

		// Fetch tags separately
		const tagIds = Array.isArray((person as any).tags) ? (person as any).tags : [];
		const tags = tagIds.length > 0 ? await TagModel.find({ _id: { $in: tagIds } }).lean() : [];
		const tagsMap = new Map(tags.map((tag: any) => [String(tag._id), tag]));

		// Add tag data to person
		const personWithTags = {
			...person,
			tags: tagIds.map((tagId: any) => tagsMap.get(String(tagId))).filter(Boolean)
		};

		// Convert to consistent format
		const firstName =
			typeof (personWithTags as any).firstName === 'string'
				? { en: (personWithTags as any).firstName, he: '' }
				: (personWithTags as any).firstName;

		const lastName =
			typeof (personWithTags as any).lastName === 'string'
				? { en: (personWithTags as any).lastName, he: '' }
				: ((personWithTags as any).lastName ||
					(personWithTags as any).familyName || { en: '', he: '' });

		// Generate fullName from firstName and lastName
		const fullName = {
			en: `${firstName.en || ''} ${lastName.en || ''}`.trim(),
			he: `${firstName.he || ''} ${lastName.he || ''}`.trim()
		};

		const convertedPerson = {
			...personWithTags,
			firstName,
			lastName,
			fullName,
			nickname:
				typeof (personWithTags as any).nickname === 'string'
					? { en: (personWithTags as any).nickname, he: '' }
					: (personWithTags as any).nickname || {},
			description:
				typeof (personWithTags as any).description === 'string'
					? { en: (personWithTags as any).description, he: '' }
					: (personWithTags as any).description || {}
		};

		return json({
			success: true,
			data: convertedPerson
		});
	} catch (error) {
		console.error('Get person error:', error);
		return json({ success: false, error: 'Failed to fetch person' }, { status: 500 });
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
		const body = await request.json();
		const { firstName, lastName, nickname, birthDate, description, tags, isActive } = body;

		// Validate ObjectId
		if (!ObjectId.isValid(id)) {
			return json({ success: false, error: 'Invalid person ID' }, { status: 400 });
		}

		// Validate required fields
		const anyFirst =
			typeof firstName === 'string'
				? !!firstName.trim()
				: Object.values((firstName as Record<string, string>) || {}).some((v) => (v || '').trim());
		const anyLast =
			typeof lastName === 'string'
				? !!lastName.trim()
				: Object.values((lastName as Record<string, string>) || {}).some((v) => (v || '').trim());
		if (!anyFirst || !anyLast) {
			return json(
				{ success: false, error: 'First name and last name are required in at least one language' },
				{ status: 400 }
			);
		}

		// Convert tag strings to ObjectIds
		let tagObjectIds = [];
		if (tags && tags.length > 0) {
			for (const tagName of tags) {
				let tag = await TagModel.findOne({ name: tagName.trim() });
				if (!tag) {
					tag = await TagModel.create({
						name: tagName.trim(),
						createdBy: locals.user.id
					});
				}
				tagObjectIds.push(tag._id);
			}
		}

		// Check if person exists
		const existingPerson = await PersonModel.findById(id);
		if (!existingPerson) {
			return json({ success: false, error: 'Person not found' }, { status: 404 });
		}

		// Generate fullName from firstName and lastName
		const fullName = {
			en: `${firstName.en || ''} ${lastName.en || ''}`.trim(),
			he: `${firstName.he || ''} ${lastName.he || ''}`.trim()
		};

		// Update person
		const updatedPerson = await PersonModel.findByIdAndUpdate(
			id,
			{
				firstName,
				lastName,
				fullName,
				nickname: nickname || {},
				birthDate: birthDate ? new Date(birthDate) : undefined,
				description: description || {},
				tags: tagObjectIds,
				isActive: isActive !== undefined ? isActive : true
			},
			{ new: true, runValidators: true }
		);

		return json({
			success: true,
			data: updatedPerson
		});
	} catch (error) {
		console.error('Update person error:', error);
		return json({ success: false, error: 'Failed to update person' }, { status: 500 });
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
			return json({ success: false, error: 'Invalid person ID' }, { status: 400 });
		}

		// Check if person exists
		const person = await PersonModel.findById(id);
		if (!person) {
			return json({ success: false, error: 'Person not found' }, { status: 404 });
		}

		// Check if person is referenced in any photos
		const photoCount = await db.collection('photos').countDocuments({
			people: new ObjectId(id)
		});

		if (photoCount > 0) {
			return json(
				{
					success: false,
					error: `Cannot delete person. They are referenced in ${photoCount} photo(s). Please remove them from photos first.`
				},
				{ status: 409 }
			);
		}

		// Delete person
		await PersonModel.findByIdAndDelete(id);

		return json({
			success: true,
			message: 'Person deleted successfully'
		});
	} catch (error) {
		console.error('Delete person error:', error);
		return json({ success: false, error: 'Failed to delete person' }, { status: 500 });
	}
};
