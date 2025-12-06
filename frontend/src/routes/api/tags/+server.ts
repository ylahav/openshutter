import { json } from '@sveltejs/kit';
import type { RequestHandler } from './$types';
import { connectToDatabase, connectMongoose } from '$lib/mongodb';
import { TagModel } from '$lib/models/Tag';
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
		const category = searchParams.get('category');
		const isActive = searchParams.get('isActive');
		const sortBy = searchParams.get('sortBy') || 'usageCount';
		const sortOrder = searchParams.get('sortOrder') || 'desc';

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
			// Search in multi-language name fields
			const langs = ['en', 'he', 'ar', 'es', 'fr', 'de', 'it', 'pt', 'ru', 'ja', 'ko', 'zh'];
			const searchRegex = { $regex: search, $options: 'i' };
			query.$or = [
				{ name: searchRegex },
				...langs.map((code) => ({ [`name.${code}`]: searchRegex }))
			];
		}

		if (category) {
			query.category = category;
		}

		if (isActive !== null && isActive !== '') {
			query.isActive = isActive === 'true';
		}

		// Build sort object
		const sort: any = {};
		sort[sortBy] = sortOrder === 'asc' ? 1 : -1;

		// Get tags with pagination
		const skip = (page - 1) * limit;
		let [tags, total] = await Promise.all([
			TagModel.find(query).sort(sort).skip(skip).limit(limit).lean(),
			TagModel.countDocuments(query)
		]);

		// If public only, filter to tags used in published photos in public albums
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

			// Get all tag IDs used in published photos that are in public albums
			const publicPhotoTags = await db.collection('photos').distinct('tags', {
				isPublished: true,
				$or: [{ albumId: { $in: publicAlbumIds } }, { albumId: { $in: publicAlbumIdStrings } }],
				tags: { $exists: true, $ne: [] }
			});

			// Get all tag IDs used in public albums
			const publicAlbumTags = await db.collection('albums').distinct('tags', {
				isPublic: true,
				tags: { $exists: true, $ne: [] }
			});

			// Combine and get unique tag IDs (normalize to strings for comparison)
			const allPublicTagIds = [...publicPhotoTags, ...publicAlbumTags];
			const publicTagIds = [
				...new Set(
					allPublicTagIds.map((id: any) => {
						if (id instanceof ObjectId) return id.toString();
						return String(id);
					})
				)
			];

			// Filter tags to only those used in public content
			tags = tags.filter((tag: any) => {
				const tagIdStr = tag._id instanceof ObjectId ? tag._id.toString() : String(tag._id);
				return publicTagIds.includes(tagIdStr);
			});
			total = tags.length;
		}

		// Normalize _id to string
		const data = tags.map((tag: any) => ({
			...tag,
			_id: tag._id instanceof ObjectId ? tag._id.toString() : String(tag._id)
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
		console.error('Tags API error:', error);
		const errorMessage = error instanceof Error ? error.message : String(error);
		return json({ success: false, error: `Failed to fetch tags: ${errorMessage}` }, { status: 500 });
	}
};

export const POST: RequestHandler = async ({ request, locals }) => {
	try {
		await connectMongoose();
		const { db } = await connectToDatabase();

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
		const { name, description, color, category } = body;

		// Validate required fields
		if (!name) {
			return json({ success: false, error: 'Tag name is required' }, { status: 400 });
		}

		// Normalize name (handle both string and MultiLangText)
		const nameObj =
			typeof name === 'string'
				? { en: name.trim() }
				: Object.fromEntries(
						Object.entries(name).map(([key, value]) => [key, typeof value === 'string' ? value.trim() : value])
					);

		// Check if tag already exists (check across all languages)
		const nameConditions = Object.keys(nameObj)
			.filter((key) => nameObj[key])
			.map((code) => ({ [`name.${code}`]: nameObj[code] }));
		const existingTag =
			nameConditions.length > 0 ? await TagModel.findOne({ $or: nameConditions }) : null;

		if (existingTag) {
			return json({ success: false, error: 'Tag with this name already exists' }, { status: 409 });
		}

		// Create new tag
		const tag = new TagModel({
			name: nameObj,
			description: description || {},
			color: color || '#3B82F6',
			category: category || 'general',
			createdBy: user.id
		});

		await tag.save();

		return json({
			success: true,
			data: {
				...tag.toObject(),
				_id: tag._id.toString()
			}
		});
	} catch (error) {
		console.error('Create tag error:', error);
		const errorMessage = error instanceof Error ? error.message : String(error);
		return json({ success: false, error: `Failed to create tag: ${errorMessage}` }, { status: 500 });
	}
};
