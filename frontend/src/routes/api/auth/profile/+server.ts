import { json } from '@sveltejs/kit';
import type { RequestHandler } from './$types';
import { connectToDatabase } from '$lib/mongodb';
import { hashPassword, verifyPassword } from '$lib/security/password';
import { ObjectId } from 'mongodb';

export const GET: RequestHandler = async ({ locals }) => {
	try {
		const user = locals.user
			? {
					id: locals.user._id || locals.user.id,
					email: locals.user.email,
					name: locals.user.name,
					role: locals.user.role || 'guest'
				}
			: null;

		if (!user) {
			return json({ error: 'Unauthorized' }, { status: 401 });
		}

		const { db } = await connectToDatabase();
		const userDoc = await db.collection('users').findOne(
			{ _id: new ObjectId(user.id) },
			{ projection: { password: 0, passwordHash: 0 } } // Exclude password from response
		);

		if (!userDoc) {
			return json({ error: 'User not found' }, { status: 404 });
		}

		// Map username to email since that's how it's stored in the database
		const userWithEmail = {
			...userDoc,
			_id: userDoc._id instanceof ObjectId ? userDoc._id.toString() : String(userDoc._id),
			email: userDoc.username // username field contains the email
		};

		return json({ user: userWithEmail });
	} catch (error) {
		console.error('Error fetching profile:', error);
		const errorMessage = error instanceof Error ? error.message : String(error);
		return json({ error: `Internal server error: ${errorMessage}` }, { status: 500 });
	}
};

export const PUT: RequestHandler = async ({ request, locals }) => {
	try {
		const user = locals.user
			? {
					id: locals.user._id || locals.user.id,
					email: locals.user.email,
					name: locals.user.name,
					role: locals.user.role || 'guest'
				}
			: null;

		if (!user) {
			return json({ error: 'Unauthorized' }, { status: 401 });
		}

		const { name, email, bio, profileImage, currentPassword, newPassword } = await request.json();
		const userId = user.id;

		const { db } = await connectToDatabase();
		const userDoc = await db.collection('users').findOne({ _id: new ObjectId(userId) });

		if (!userDoc) {
			return json({ error: 'User not found' }, { status: 404 });
		}

		// If changing password, verify current password
		if (newPassword) {
			if (!currentPassword) {
				return json(
					{ error: 'Current password is required to change password' },
					{ status: 400 }
				);
			}

			const passwordToCheck = userDoc.passwordHash || userDoc.password;
			if (!passwordToCheck) {
				return json({ error: 'User has no password set' }, { status: 400 });
			}

			const isCurrentPasswordValid = await verifyPassword(currentPassword, passwordToCheck);
			if (!isCurrentPasswordValid) {
				return json({ error: 'Current password is incorrect' }, { status: 400 });
			}

			if (newPassword.length < 6) {
				return json(
					{ error: 'New password must be at least 6 characters long' },
					{ status: 400 }
				);
			}
		}

		// Prepare update data
		const updateData: any = {
			name: name || userDoc.name,
			username: email || userDoc.username, // Update username field with email value
			bio: bio !== undefined ? bio : userDoc.bio,
			profileImage: profileImage !== undefined ? profileImage : userDoc.profileImage,
			updatedAt: new Date()
		};

		// Hash new password if provided
		if (newPassword) {
			updateData.passwordHash = await hashPassword(newPassword);
		}

		// Update user
		const result = await db.collection('users').updateOne(
			{ _id: new ObjectId(userId) },
			{ $set: updateData }
		);

		if (result.matchedCount === 0) {
			return json({ error: 'User not found' }, { status: 404 });
		}

		// Fetch updated user (excluding password)
		const updatedUser = await db.collection('users').findOne(
			{ _id: new ObjectId(userId) },
			{ projection: { password: 0, passwordHash: 0 } }
		);

		if (!updatedUser) {
			return json({ error: 'User not found after update' }, { status: 404 });
		}

		// Map username to email for consistency
		const userWithEmail = {
			...updatedUser,
			_id: updatedUser._id instanceof ObjectId ? updatedUser._id.toString() : String(updatedUser._id),
			email: updatedUser.username
		};

		return json({
			user: userWithEmail,
			message: 'Profile updated successfully'
		});
	} catch (error) {
		console.error('Error updating profile:', error);
		const errorMessage = error instanceof Error ? error.message : String(error);
		return json({ error: `Internal server error: ${errorMessage}` }, { status: 500 });
	}
};
