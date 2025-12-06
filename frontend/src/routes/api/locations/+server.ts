import { json } from '@sveltejs/kit';
import type { RequestHandler } from './$types';
import { connectToDatabase, connectMongoose } from '$lib/mongodb';
import { LocationModel } from '$lib/models/Location';
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
			// Use regex search across multilingual fields and address fields
			const escapedSearch = search.replace(/[.*+?^${}()|[\]\\]/g, '\\$&');
			const langs = SUPPORTED_LANGUAGES.map((l) => l.code);

			// Search in name and names fields
			const nameConds = ['name', 'names'].flatMap((f) =>
				langs.map((code) => ({
					[`${f}.${code}`]: { $regex: escapedSearch, $options: 'i' }
				}))
			);

			const descConds = langs.map((code) => ({
				[`description.${code}`]: { $regex: escapedSearch, $options: 'i' }
			}));

			// Search in address fields
			const addressConds = ['address', 'city', 'state', 'country'].map((f) => ({
				[f]: { $regex: escapedSearch, $options: 'i' }
			}));

			query.$or = [...nameConds, ...descConds, ...addressConds];
		}

		if (category) {
			query.category = category;
		}

		if (isActive !== null && isActive !== '') {
			query.isActive = isActive === 'true';
		}

		// Build sort object
		const validSortFields = ['usageCount', 'createdAt', 'updatedAt', 'city', 'country', 'category'];
		const safeSortBy = validSortFields.includes(sortBy) ? sortBy : 'createdAt';
		const sort: any = {};
		sort[safeSortBy] = sortOrder === 'asc' ? 1 : -1;

		// Get locations with pagination
		const skip = (page - 1) * limit;
		let [locations, total] = await Promise.all([
			LocationModel.find(query).sort(sort).skip(skip).limit(limit).lean(),
			LocationModel.countDocuments(query)
		]);

		// If public only, filter to locations used in published photos in public albums
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

			// Get all location IDs used in published photos that are in public albums
			const publicPhotoLocations = await db.collection('photos').distinct('location', {
				isPublished: true,
				$or: [{ albumId: { $in: publicAlbumIds } }, { albumId: { $in: publicAlbumIdStrings } }],
				location: { $exists: true, $ne: null }
			});

			// Normalize location IDs to strings for comparison
			const publicLocationIds = [
				...new Set(
					publicPhotoLocations.map((id: any) => {
						if (id instanceof ObjectId) return id.toString();
						return String(id);
					})
				)
			];

			// Filter locations to only those used in public photos
			locations = locations.filter((location: any) => {
				const locationIdStr =
					location._id instanceof ObjectId ? location._id.toString() : String(location._id);
				return publicLocationIds.includes(locationIdStr);
			});
			total = locations.length;
		}

		// Normalize _id to string
		const data = locations.map((location: any) => ({
			...location,
			_id: location._id instanceof ObjectId ? location._id.toString() : String(location._id)
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
		console.error('Locations API error:', error);
		const errorMessage = error instanceof Error ? error.message : String(error);
		return json(
			{ success: false, error: `Failed to fetch locations: ${errorMessage}` },
			{ status: 500 }
		);
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
		const {
			name,
			description,
			address,
			city,
			state,
			country,
			postalCode,
			coordinates,
			placeId,
			category
		} = body;

		// Validate required fields
		const hasAnyName =
			typeof name === 'string'
				? !!name.trim()
				: Object.values((name as Record<string, string>) || {}).some((v) => (v || '').trim());
		if (!hasAnyName) {
			return json({ success: false, error: 'Location name is required' }, { status: 400 });
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
			: {};

		// Check if location already exists (check by any language name)
		const nameConditions = SUPPORTED_LANGUAGES.map((l) => ({
			[`name.${l.code}`]: (nameObj as any)[l.code]
		})).filter((cond) => Object.values(cond)[0]);
		const existingLocation =
			nameConditions.length > 0
				? await LocationModel.findOne({
						$or: nameConditions,
						city: city?.trim(),
						country: country?.trim()
					})
				: null;

		if (existingLocation) {
			return json(
				{ success: false, error: 'Location with this name and address already exists' },
				{ status: 409 }
			);
		}

		// Create new location
		const location = new LocationModel({
			name: nameObj,
			description: descriptionObj,
			address: address?.trim(),
			city: city?.trim(),
			state: state?.trim(),
			country: country?.trim(),
			postalCode: postalCode?.trim(),
			coordinates: coordinates
				? {
						latitude: coordinates.latitude,
						longitude: coordinates.longitude
					}
				: undefined,
			placeId: placeId?.trim(),
			category: category || 'custom',
			createdBy: user.id
		});

		await location.save();

		return json({
			success: true,
			data: {
				...location.toObject(),
				_id: location._id.toString()
			}
		});
	} catch (error) {
		console.error('Create location error:', error);
		const errorMessage = error instanceof Error ? error.message : String(error);
		return json(
			{ success: false, error: `Failed to create location: ${errorMessage}` },
			{ status: 500 }
		);
	}
};

