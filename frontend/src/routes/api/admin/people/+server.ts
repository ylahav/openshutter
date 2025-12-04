import { json } from '@sveltejs/kit';
import type { RequestHandler } from './$types';
import { connectToDatabase, connectMongoose } from '$lib/mongodb';
import { PersonModel } from '$lib/models/Person';
import { SUPPORTED_LANGUAGES } from '$lib/types/multi-lang';
import { TagModel } from '$lib/models/Tag';
import { ObjectId } from 'mongodb';

export const GET: RequestHandler = async ({ url, locals }) => {
	try {
		// Require admin access
		if (!locals.user || locals.user.role !== 'admin') {
			return json({ success: false, error: 'Unauthorized' }, { status: 401 });
		}

		const searchParams = url.searchParams;
		await connectMongoose();
		const { db } = await connectToDatabase();

		// Get query parameters
		const search = searchParams.get('search');
		const page = parseInt(searchParams.get('page') || '1');
		const limit = parseInt(searchParams.get('limit') || '20');
		const isActive = searchParams.get('isActive');

		// Build query
		const query: any = {};

		if (search) {
			const langs = SUPPORTED_LANGUAGES.map((l) => l.code);
			const fields = ['firstName', 'lastName', 'fullName', 'nickname', 'description'];
			query.$or = fields.flatMap((f) =>
				langs.map((code) => ({ [`${f}.${code}`]: { $regex: search, $options: 'i' } }))
			);
		}

		if (isActive !== null) {
			query.isActive = isActive === 'true';
		}

		// Get people with pagination (admin sees all, no public filtering)
		const skip = (page - 1) * limit;
		const [people, total] = await Promise.all([
			PersonModel.find(query).sort({ fullName: 1 }).skip(skip).limit(limit).lean(),
			PersonModel.countDocuments(query)
		]);

		// Get all unique tag IDs from people
		const tagIds = [...new Set(people.flatMap((person) => person.tags || []))];

		// Fetch tags separately
		const tags = tagIds.length > 0 ? await TagModel.find({ _id: { $in: tagIds } }).lean() : [];
		const tagsMap = new Map(tags.map((tag: any) => [String(tag._id), tag]));

		// Add tag data to people and convert old string format to MultiLangText format for compatibility
		const peopleWithTags = people.map((person) => {
			const firstName =
				typeof (person as any).firstName === 'string'
					? { en: (person as any).firstName, he: '' }
					: (person as any).firstName;

			const lastName =
				typeof (person as any).lastName === 'string'
					? { en: (person as any).lastName, he: '' }
					: ((person as any).lastName ||
						(person as any).familyName || { en: '', he: '' });

			// Generate fullName from firstName and lastName
			const fullName = {
				en: `${firstName.en || ''} ${lastName.en || ''}`.trim(),
				he: `${firstName.he || ''} ${lastName.he || ''}`.trim()
			};

			return {
				...person,
				firstName,
				lastName,
				fullName,
				tags: (person.tags || [])
					.map((tagId: any) => tagsMap.get(String(tagId)))
					.filter(Boolean),
				nickname:
					typeof (person as any).nickname === 'string'
						? { en: (person as any).nickname, he: '' }
						: (person as any).nickname || {},
				description:
					typeof (person as any).description === 'string'
						? { en: (person as any).description, he: '' }
						: (person as any).description || {}
			};
		});

		return json({
			success: true,
			data: peopleWithTags,
			pagination: {
				page,
				limit,
				total,
				pages: Math.ceil(total / limit)
			}
		});
	} catch (error) {
		console.error('Admin People API error:', error);
		return json({ success: false, error: 'Failed to fetch people' }, { status: 500 });
	}
};

export const POST: RequestHandler = async ({ request, locals }) => {
	try {
		// Require admin access
		if (!locals.user || locals.user.role !== 'admin') {
			return json({ success: false, error: 'Unauthorized' }, { status: 401 });
		}

		await connectMongoose();
		const body = await request.json();
		const { firstName, lastName, nickname, birthDate, description, tags } = body;

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

		// Generate fullName from firstName and lastName for comparison
		const langs = SUPPORTED_LANGUAGES.map((l) => l.code);
		const fullNamesByLang = langs.reduce((acc: any, code: string) => {
			const fn = typeof firstName === 'object' ? (firstName as any)[code] || '' : '';
			const ln = typeof lastName === 'object' ? (lastName as any)[code] || '' : '';
			const combined = `${(fn || '').trim()} ${(ln || '').trim()}`.trim();
			if (combined) acc[code] = combined;
			return acc;
		}, {});

		// Check if person already exists
		const duplicateConditions = [];
		for (const code of Object.keys(fullNamesByLang)) {
			duplicateConditions.push({ [`fullName.${code}`]: (fullNamesByLang as any)[code] });
		}

		if (duplicateConditions.length > 0) {
			const existingPerson = await PersonModel.findOne({ $or: duplicateConditions });
			if (existingPerson) {
				return json(
					{ success: false, error: 'Person with this name already exists' },
					{ status: 409 }
				);
			}
		}

		// Generate fullName from firstName and lastName
		const fullName = fullNamesByLang;

		// Create new person
		const person = new PersonModel({
			firstName,
			lastName,
			fullName,
			nickname: nickname || {},
			birthDate: birthDate ? new Date(birthDate) : undefined,
			description: description || {},
			tags: tagObjectIds,
			createdBy: locals.user.id
		});

		await person.save();

		return json({
			success: true,
			data: person
		});
	} catch (error) {
		console.error('Create person error:', error);
		return json({ success: false, error: 'Failed to create person' }, { status: 500 });
	}
};

