import { json } from '@sveltejs/kit';
import type { RequestHandler } from './$types';
import { connectToDatabase, connectMongoose } from '$lib/mongodb';
import { UserModel } from '$lib/models/User';
import { hashPassword } from '$lib/security/password';
import { ObjectId } from 'mongodb';

export const GET: RequestHandler = async ({ url, locals }) => {
	try {
		// Require admin access
		if (!locals.user || locals.user.role !== 'admin') {
			return json({ success: false, error: 'Unauthorized' }, { status: 401 });
		}

		await connectMongoose();
		const { db } = await connectToDatabase();
		const searchParams = url.searchParams;

		// Get query parameters
		const search = searchParams.get('search');
		const roleFilter = searchParams.get('role');
		const blockedFilter = searchParams.get('blocked');
		const page = parseInt(searchParams.get('page') || '1');
		const limit = parseInt(searchParams.get('limit') || '100');

		// Build query
		const query: any = {};

		if (search) {
			// Search in username and name fields (name can be string or multi-language object)
			const searchRegex = { $regex: search, $options: 'i' };
			query.$or = [
				{ username: searchRegex },
				{ name: searchRegex },
				// Multi-language name fields
				{ 'name.en': searchRegex },
				{ 'name.he': searchRegex }
			];
		}

		if (roleFilter && roleFilter !== 'all') {
			query.role = roleFilter;
		}

		if (blockedFilter !== null && blockedFilter !== undefined) {
			query.blocked = blockedFilter === 'true';
		}

		// Get users with pagination
		const skip = (page - 1) * limit;
		const [users, total] = await Promise.all([
			UserModel.find(query).sort({ username: 1 }).skip(skip).limit(limit).lean(),
			UserModel.countDocuments(query)
		]);

		// Remove passwordHash from response
		const data = users.map((user: any) => {
			const { passwordHash, ...rest } = user;
			return { ...rest, _id: String(user._id) };
		});

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
		console.error('Admin Users API error:', error);
		return json({ success: false, error: 'Failed to fetch users' }, { status: 500 });
	}
};

export const POST: RequestHandler = async ({ request, locals }) => {
	try {
		// Require admin access
		if (!locals.user || locals.user.role !== 'admin') {
			return json({ success: false, error: 'Unauthorized' }, { status: 401 });
		}

		await connectMongoose();
		const { db } = await connectToDatabase();
		const body = await request.json();
		const { name, username, password, role, groupAliases, blocked, allowedStorageProviders } = body;

		// Validate required fields
		if (!name || !username || !password || !role) {
			return json(
				{ success: false, error: 'name, username, password, and role are required' },
				{ status: 400 }
			);
		}

		// Check if username already exists
		const normalizedUsername = String(username).toLowerCase().trim();
		const existingUser = await UserModel.findOne({ username: normalizedUsername });
		if (existingUser) {
			return json({ success: false, error: 'Username already exists' }, { status: 409 });
		}

		// Hash password
		const passwordHash = await hashPassword(password);

		// Create user document
		const now = new Date();
		const user = new UserModel({
			name,
			username: normalizedUsername,
			passwordHash,
			role,
			groupAliases: Array.isArray(groupAliases) ? groupAliases : [],
			blocked: Boolean(blocked),
			allowedStorageProviders: Array.isArray(allowedStorageProviders)
				? allowedStorageProviders
				: ['local'],
			createdAt: now,
			updatedAt: now
		});

		await user.save();

		// Return user without passwordHash
		const userObj = user.toObject();
		const { passwordHash: _omit, ...rest } = userObj as any;

		return json(
			{
				success: true,
				data: { ...rest, _id: String(user._id) }
			},
			{ status: 201 }
		);
	} catch (error) {
		console.error('Create user error:', error);
		const errorMessage = error instanceof Error ? error.message : String(error);
		return json({ success: false, error: `Failed to create user: ${errorMessage}` }, { status: 500 });
	}
};

