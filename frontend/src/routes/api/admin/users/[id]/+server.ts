import { json } from '@sveltejs/kit';
import type { RequestHandler } from './$types';
import { connectToDatabase, connectMongoose } from '$lib/mongodb';
import { UserModel } from '$lib/models/User';
import { hashPassword } from '$lib/security/password';
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
			return json({ success: false, error: 'Invalid user ID' }, { status: 400 });
		}

		const user = await UserModel.findById(id).lean();

		if (!user) {
			return json({ success: false, error: 'User not found' }, { status: 404 });
		}

		// Remove passwordHash from response
		const { passwordHash, ...rest } = user as any;

		return json({
			success: true,
			data: { ...rest, _id: String(user._id) }
		});
	} catch (error) {
		console.error('Get user error:', error);
		return json({ success: false, error: 'Failed to fetch user' }, { status: 500 });
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
			return json({ success: false, error: 'Invalid user ID' }, { status: 400 });
		}

		const body = await request.json();
		const { name, password, role, groupAliases, blocked, allowedStorageProviders } = body;

		// Build update object
		const update: any = { updatedAt: new Date() };

		if (name !== undefined) {
			update.name = name;
		}
		if (role !== undefined) {
			update.role = role;
		}
		if (Array.isArray(groupAliases)) {
			update.groupAliases = groupAliases;
		}
		if (password) {
			update.passwordHash = await hashPassword(password);
		}
		if (typeof blocked === 'boolean') {
			update.blocked = blocked;
		}
		if (Array.isArray(allowedStorageProviders)) {
			update.allowedStorageProviders = allowedStorageProviders;
		}

		const _id = new ObjectId(id);

		// If we're updating role or blocked status, check admin validation
		if (role !== undefined || typeof blocked === 'boolean') {
			const currentUser = await UserModel.findById(_id).lean();
			if (!currentUser) {
				return json({ success: false, error: 'User not found' }, { status: 404 });
			}

			// Check if this would result in no active admins
			const newRole = role !== undefined ? role : currentUser.role;
			const newBlocked = typeof blocked === 'boolean' ? blocked : currentUser.blocked;

			if (newRole === 'admin' && !newBlocked) {
				// This user will remain an active admin, so it's safe
			} else {
				// Check if there are other active admins
				const otherActiveAdmins = await UserModel.countDocuments({
					_id: { $ne: _id },
					role: 'admin',
					blocked: { $ne: true }
				});

				if (otherActiveAdmins === 0) {
					return json(
						{
							success: false,
							error: 'Cannot block or change role: At least one admin must remain active'
						},
						{ status: 400 }
					);
				}
			}
		}

		// Update user
		const result = await UserModel.findByIdAndUpdate(_id, { $set: update }, { new: true }).lean();

		if (!result) {
			return json({ success: false, error: 'User not found' }, { status: 404 });
		}

		// Remove passwordHash from response
		const { passwordHash: _omit, ...rest } = result as any;

		return json({
			success: true,
			data: { ...rest, _id: String(result._id) }
		});
	} catch (error) {
		console.error('Update user error:', error);
		const errorMessage = error instanceof Error ? error.message : String(error);
		return json({ success: false, error: `Failed to update user: ${errorMessage}` }, { status: 500 });
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
			return json({ success: false, error: 'Invalid user ID' }, { status: 400 });
		}

		const _id = new ObjectId(id);

		// Check if this is the last active admin
		const user = await UserModel.findById(_id).lean();
		if (!user) {
			return json({ success: false, error: 'User not found' }, { status: 404 });
		}

		if (user.role === 'admin' && !user.blocked) {
			const otherActiveAdmins = await UserModel.countDocuments({
				_id: { $ne: _id },
				role: 'admin',
				blocked: { $ne: true }
			});

			if (otherActiveAdmins === 0) {
				return json(
					{
						success: false,
						error: 'Cannot delete: At least one admin must remain active'
					},
					{ status: 400 }
				);
			}
		}

		// Delete user
		const result = await UserModel.findByIdAndDelete(_id);

		if (!result) {
			return json({ success: false, error: 'User not found' }, { status: 404 });
		}

		return json({ success: true });
	} catch (error) {
		console.error('Delete user error:', error);
		const errorMessage = error instanceof Error ? error.message : String(error);
		return json({ success: false, error: `Failed to delete user: ${errorMessage}` }, { status: 500 });
	}
};
