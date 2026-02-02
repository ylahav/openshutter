import { json } from '@sveltejs/kit';
import type { RequestHandler } from './$types';
import { SignJWT } from 'jose';
import { env } from '$env/dynamic/private';
import { backendGet, parseBackendResponse } from '$lib/utils/backend-api';
import { logger } from '$lib/utils/logger';

const JWT_TTL = 60 * 60 * 24 * 7; // 7 days

function getJWTSecret(): Uint8Array {
	const baseSecret = env.AUTH_JWT_SECRET || process.env.AUTH_JWT_SECRET || 'dev-secret-change-me-in-production';
	return new TextEncoder().encode(baseSecret);
}

/**
 * Refresh the session JWT with current user data from the backend (e.g. after password change so forcePasswordChange is updated).
 * Requires valid auth cookie. Returns the updated user and sets a new auth_token cookie.
 */
export const POST: RequestHandler = async ({ locals, cookies }) => {
	try {
		if (!locals.user?.id) {
			return json({ success: false, error: 'Unauthorized' }, { status: 401 });
		}

		const response = await backendGet('/auth/profile', { cookies });
		const result = await parseBackendResponse<{ user: any }>(response);
		const user = result?.user;

		if (!user) {
			return json({ success: false, error: 'Profile not found' }, { status: 404 });
		}

		const JWT_SECRET = getJWTSecret();
		const displayName = typeof user.name === 'object'
			? (user.name?.en || (user.name && Object.values(user.name)[0]))
			: user.name;
		const jwt = await new SignJWT({
			email: user.email,
			name: displayName || user.email,
			role: user.role,
			forcePasswordChange: user.forcePasswordChange ?? false,
		})
			.setProtectedHeader({ alg: 'HS256' })
			.setSubject(String(user._id))
			.setIssuedAt()
			.setExpirationTime(`${JWT_TTL}s`)
			.sign(JWT_SECRET);

		const isProduction = process.env.NODE_ENV === 'production';
		cookies.set('auth_token', jwt, {
			httpOnly: true,
			secure: isProduction,
			path: '/',
			maxAge: JWT_TTL,
			sameSite: 'lax',
		});

		return json({ success: true, user });
	} catch (error) {
		logger.error('Refresh session error:', error);
		return json({ success: false, error: 'Failed to refresh session' }, { status: 500 });
	}
};
