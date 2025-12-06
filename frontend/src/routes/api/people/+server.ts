import { json } from '@sveltejs/kit';
import type { RequestHandler } from './$types';
import { connectToDatabase, connectMongoose } from '$lib/mongodb';
import { PersonModel } from '$lib/models/Person';
import { TagModel } from '$lib/models/Tag';
import { SUPPORTED_LANGUAGES } from '$lib/types/multi-lang';
import { ObjectId } from 'mongodb';

export const GET: RequestHandler = async ({ url, locals }) => {
	try {
		await connectMongoose();
		const { db } = await connectToDatabase();
		const searchParams = url.searchParams;

		// Get query parameters
		const search = searchParams.get('search');
		const page = parseInt(searchParams.get('page') || '1');
		const limit = parseInt(searchParams.get('limit') || '20');
		const isActive = searchParams.get('isActive');

		// Get current user for access control
		const user = locals.user
			? {
					id: locals.user._id || locals.user.id,
					email: locals.user.email,
					name: locals.user.name,
					role: locals.user.role || 'guest'
				}
			: null;
		const isPublicOnly = !user;

		// Build query
		const query: any = {};

		if (search) {
			const langs = SUPPORTED_LANGUAGES.map((l) => l.code);
			const fields = ['firstName', 'lastName', 'fullName', 'nickname', 'description'];
			query.$or = fields.flatMap((f) =>
				langs.map((code) => ({ [`${f}.${code}`]: { $regex: search, $options: 'i' } }))
			);
		}

		if (isActive !== null && isActive !== '') {
			query.isActive = isActive === 'true';
		}

		// Get people with pagination
		const skip = (page - 1) * limit;
		let [people, total] = await Promise.all([
			PersonModel.find(query).sort({ fullName: 1 }).skip(skip).limit(limit).lean(),
			PersonModel.countDocuments(query)
		]);

		// If public only, filter to people tagged in published photos in public albums
		if (isPublicOnly) {
			// Get all public album IDs (handle both ObjectId and string formats)
			const publicAlbums = await db
				.collection('albums')
				.find({ isPublic: true }, { projection: { _id: 1 } })
				.toArray();
			const publicAlbumIds = publicAlbums.map((a: any) => {
				const id = a._id;
				return id instanceof ObjectId ? id : new ObjectId(String(id));
			});
			const publicAlbumIdStrings = publicAlbumIds.map((id: any) => String(id));

			// Get all people IDs tagged in published photos that are in public albums
			const publicPhotoPeople = await db.collection('photos').distinct('people', {
				isPublished: true,
				$or: [{ albumId: { $in: publicAlbumIds } }, { albumId: { $in: publicAlbumIdStrings } }],
				people: { $exists: true, $ne: [] }
			});

			// Normalize people IDs to strings for comparison
			const publicPeopleIds = [
				...new Set(
					publicPhotoPeople.map((id: any) => {
						if (id instanceof ObjectId) return id.toString();
						return String(id);
					})
				)
			];

			// Filter people to only those tagged in public photos
			people = people.filter((person: any) => {
				const personIdStr = person._id instanceof ObjectId ? person._id.toString() : String(person._id);
				return publicPeopleIds.includes(personIdStr);
			});
			total = people.length;
		}

		// Get all unique tag IDs from people
		const tagIds = [...new Set(people.flatMap((person) => person.tags || []))];

		// Fetch tags separately
		const tags =
			tagIds.length > 0
				? await TagModel.find({ _id: { $in: tagIds.map((id: any) => new ObjectId(String(id))) } }).lean()
				: [];
		const tagsMap = new Map(tags.map((tag: any) => [String(tag._id), tag]));

		// Add tag data to people and convert old string format to MultiLangText format for compatibility
		const peopleWithTags = people.map((person: any) => {
			const firstName =
				typeof person.firstName === 'string' ? { en: person.firstName, he: '' } : person.firstName;

			const lastName =
				typeof person.lastName === 'string'
					? { en: person.lastName, he: '' }
					: person.lastName || person.familyName || { en: '', he: '' };

			// Generate fullName from firstName and lastName
			const langCodes = SUPPORTED_LANGUAGES.map((l) => l.code);
			const fullName = langCodes.reduce((acc: any, code: string) => {
				const fn = typeof firstName === 'object' ? firstName[code] || '' : '';
				const ln = typeof lastName === 'object' ? lastName[code] || '' : '';
				const combined = `${(fn || '').trim()} ${(ln || '').trim()}`.trim();
				if (combined) acc[code] = combined;
				return acc;
			}, {});

			return {
				...person,
				_id: person._id instanceof ObjectId ? person._id.toString() : String(person._id),
				firstName,
				lastName,
				fullName,
				tags: (person.tags || []).map((tagId: any) => tagsMap.get(String(tagId))).filter(Boolean),
				nickname:
					typeof person.nickname === 'string'
						? { en: person.nickname, he: '' }
						: person.nickname || {},
				description:
					typeof person.description === 'string'
						? { en: person.description, he: '' }
						: person.description || {}
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
		console.error('People API error:', error);
		const errorMessage = error instanceof Error ? error.message : String(error);
		return json({ success: false, error: `Failed to fetch people: ${errorMessage}` }, { status: 500 });
	}
};

export const POST: RequestHandler = async ({ request, locals }) => {
	try {
		await connectMongoose();

		// Get current user for access control
		const user = locals.user
			? {
					id: locals.user._id || locals.user.id,
					email: locals.user.email,
					name: locals.user.name,
					role: locals.user.role || 'guest'
				}
			: null;

		if (!user) {
			return json({ success: false, error: 'Unauthorized' }, { status: 401 });
		}

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
		let tagObjectIds: ObjectId[] = [];
		if (tags && tags.length > 0) {
			for (const tagName of tags) {
				let tag = await TagModel.findOne({ name: tagName.trim() });
				if (!tag) {
					tag = await TagModel.create({
						name: tagName.trim(),
						createdBy: user.id
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

		// Check if person already exists (check by exact full name match)
		const duplicateConditions = Object.keys(fullNamesByLang).map((code) => ({
			[`fullName.${code}`]: fullNamesByLang[code]
		}));

		if (duplicateConditions.length > 0) {
			const existingPerson = await PersonModel.findOne({ $or: duplicateConditions });

			if (existingPerson) {
				return json({ success: false, error: 'Person with this name already exists' }, { status: 409 });
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
			createdBy: user.id
		});

		await person.save();

		return json({
			success: true,
			data: {
				...person.toObject(),
				_id: person._id.toString()
			}
		});
	} catch (error) {
		console.error('Create person error:', error);
		const errorMessage = error instanceof Error ? error.message : String(error);
		return json({ success: false, error: `Failed to create person: ${errorMessage}` }, { status: 500 });
	}
};
