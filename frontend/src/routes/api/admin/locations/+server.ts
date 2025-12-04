import { json } from '@sveltejs/kit';
import type { RequestHandler } from './$types';
import { connectToDatabase, connectMongoose } from '$lib/mongodb';
import { LocationModel } from '$lib/models/Location';
import { SUPPORTED_LANGUAGES } from '$lib/types/multi-lang';
import { ObjectId } from 'mongodb';

export const GET: RequestHandler = async ({ url, locals }) => {
	try {
		// Require admin access
		if (!locals.user || locals.user.role !== 'admin') {
			return json({ success: false, error: 'Unauthorized' }, { status: 401 });
		}

		const searchParams = url.searchParams;
		await connectToDatabase();
		await connectMongoose();

		// Ensure LocationModel is available
		if (!LocationModel) {
			throw new Error('LocationModel is not available');
		}

		// Get query parameters
		const search = searchParams.get('search');
		const page = parseInt(searchParams.get('page') || '1');
		const limit = parseInt(searchParams.get('limit') || '20');
		const category = searchParams.get('category');
		const isActive = searchParams.get('isActive');
		const sortBy = searchParams.get('sortBy') || 'usageCount';
		const sortOrder = searchParams.get('sortOrder') || 'desc';

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

		// Get locations with pagination (admin sees all, no public filtering)
		const skip = (page - 1) * limit;
		const [locations, total] = await Promise.all([
			LocationModel.find(query).sort(sort).skip(skip).limit(limit).lean(),
			LocationModel.countDocuments(query)
		]);

		return json({
			success: true,
			data: locations,
			pagination: {
				page,
				limit,
				total,
				pages: Math.ceil(total / limit)
			}
		});
	} catch (error) {
		console.error('Admin Locations API error:', error);
		return json({ success: false, error: 'Failed to fetch locations' }, { status: 500 });
	}
};

export const POST: RequestHandler = async ({ request, locals }) => {
	try {
		// Require admin access
		if (!locals.user || locals.user.role !== 'admin') {
			return json({ success: false, error: 'Unauthorized' }, { status: 401 });
		}

		await connectToDatabase();
		await connectMongoose();

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

		// Check if location already exists
		const nameConditions = SUPPORTED_LANGUAGES.map((l) => ({
			[`name.${l.code}`]: (nameObj as any)[l.code]
		})).filter((cond) => Object.values(cond)[0]);
		const existingLocation =
			nameConditions.length
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
			createdBy: locals.user.id
		});

		await location.save();

		return json({
			success: true,
			data: location
		});
	} catch (error) {
		console.error('Create location error:', error);
		return json({ success: false, error: 'Failed to create location' }, { status: 500 });
	}
};
