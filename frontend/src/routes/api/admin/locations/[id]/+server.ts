import { json } from '@sveltejs/kit';
import type { RequestHandler } from './$types';
import { connectToDatabase, connectMongoose } from '$lib/mongodb';
import { LocationModel } from '$lib/models/Location';
import { SUPPORTED_LANGUAGES } from '$lib/types/multi-lang';
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
			return json({ success: false, error: 'Invalid location ID' }, { status: 400 });
		}

		// Find location
		const location = await LocationModel.findById(id).lean();

		if (!location) {
			return json({ success: false, error: 'Location not found' }, { status: 404 });
		}

		return json({
			success: true,
			data: location
		});
	} catch (error) {
		console.error('Get location error:', error);
		return json({ success: false, error: 'Failed to fetch location' }, { status: 500 });
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
			category,
			isActive
		} = body;

		// Validate ObjectId
		if (!ObjectId.isValid(id)) {
			return json({ success: false, error: 'Invalid location ID' }, { status: 400 });
		}

		// Validate required fields
		const hasAnyName =
			typeof name === 'string'
				? !!name.trim()
				: Object.values((name as Record<string, string>) || {}).some((v) => (v || '').trim());
		if (!hasAnyName) {
			return json({ success: false, error: 'Location name is required' }, { status: 400 });
		}

		// Check if location exists
		const existingLocation = await LocationModel.findById(id);
		if (!existingLocation) {
			return json({ success: false, error: 'Location not found' }, { status: 404 });
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

		// Check for duplicate name and address
		const nameConditions = SUPPORTED_LANGUAGES.map((l) => ({
			[`name.${l.code}`]: (nameObj as any)[l.code]
		})).filter((cond) => Object.values(cond)[0]);
		const duplicateLocation =
			nameConditions.length
				? await LocationModel.findOne({
						_id: { $ne: id },
						$or: nameConditions,
						city: city?.trim(),
						country: country?.trim()
					})
				: null;

		if (duplicateLocation) {
			return json(
				{ success: false, error: 'Location with this name and address already exists' },
				{ status: 409 }
			);
		}

		// Update location
		const updateData: any = {
			name: nameObj,
			description: descriptionObj,
			address: address?.trim(),
			city: city?.trim(),
			state: state?.trim(),
			country: country?.trim(),
			postalCode: postalCode?.trim(),
			placeId: placeId?.trim(),
			category: category || 'custom',
			updatedAt: new Date()
		};

		if (coordinates) {
			updateData.coordinates = {
				latitude: coordinates.latitude,
				longitude: coordinates.longitude
			};
		}

		if (isActive !== undefined) {
			updateData.isActive = isActive;
		}

		const updatedLocation = await LocationModel.findByIdAndUpdate(id, updateData, {
			new: true,
			runValidators: true
		}).lean();

		return json({
			success: true,
			data: updatedLocation
		});
	} catch (error) {
		console.error('Update location error:', error);
		return json({ success: false, error: 'Failed to update location' }, { status: 500 });
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
			return json({ success: false, error: 'Invalid location ID' }, { status: 400 });
		}

		// Check if location exists
		const location = await LocationModel.findById(id);
		if (!location) {
			return json({ success: false, error: 'Location not found' }, { status: 404 });
		}

		// Check if location is being used in photos
		const photosUsingLocation = await db.collection('photos').countDocuments({
			location: new ObjectId(id)
		});

		if (photosUsingLocation > 0) {
			return json(
				{
					success: false,
					error: `Cannot delete location. It is being used by ${photosUsingLocation} photo(s). Please remove the location from photos first.`
				},
				{ status: 409 }
			);
		}

		// Delete location
		await LocationModel.findByIdAndDelete(id);

		return json({
			success: true,
			message: 'Location deleted successfully'
		});
	} catch (error) {
		console.error('Delete location error:', error);
		return json({ success: false, error: 'Failed to delete location' }, { status: 500 });
	}
};
