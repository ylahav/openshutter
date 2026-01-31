import type { Handle } from '@sveltejs/kit';
import { jwtVerify } from 'jose';
import { env } from '$env/dynamic/private';

// Simple static JWT secret - matches backend
// Frontend only uses this for UI state (showing user info)
// Backend handles all authentication enforcement
function getJWTSecret(): Uint8Array {
	const baseSecret = env.AUTH_JWT_SECRET || process.env.AUTH_JWT_SECRET || 'dev-secret-change-me-in-production';
	// Convert string secret to Uint8Array for jose library
	return new TextEncoder().encode(baseSecret);
}

const JWT_SECRET = getJWTSecret();

export const handle: Handle = async ({ event, resolve }) => {
	// Default anonymous user - this is just for UI state
	// Backend handles all authentication enforcement
	event.locals.user = null;

	const token = event.cookies.get('auth_token');
	
	if (token) {
		try {
			// Verify token for UI state only - backend handles auth enforcement
			const { payload } = await jwtVerify(token, JWT_SECRET);
			event.locals.user = {
				id: String(payload.sub),
				email: String(payload.email),
				name: String(payload.name),
				role: (payload.role as 'admin' | 'owner' | 'guest') ?? 'owner'
			};
		} catch (error: any) {
			// Invalid/expired token - clear it
			// Don't log errors here - backend will handle authentication
			event.cookies.delete('auth_token', { path: '/' });
		}
	}

	// For page routes, still check authentication (backend handles API routes)
	// This provides a better UX by redirecting before the page loads
	const path = event.url.pathname;
	if (path.startsWith('/admin') && !path.startsWith('/api/')) {
		if (!event.locals.user) {
			return Response.redirect(new URL('/login?redirect=' + encodeURIComponent(path), event.url), 303);
		}
		// Owners: album management and photo upload/edit (backend enforces ownership); admins: all admin routes
		const ownerAllowed =
			path.startsWith('/admin/photos/upload') ||
			/^\/admin\/photos\/[^/]+\/edit\/?$/.test(path) ||
			path.startsWith('/admin/albums');
		if (event.locals.user.role === 'owner' && !ownerAllowed) {
			return Response.redirect(new URL('/login?redirect=' + encodeURIComponent(path), event.url), 303);
		}
		if (event.locals.user.role !== 'admin' && event.locals.user.role !== 'owner') {
			return Response.redirect(new URL('/login?redirect=' + encodeURIComponent(path), event.url), 303);
		}
	}

	if (path.startsWith('/owner') && !path.startsWith('/api/')) {
		if (!event.locals.user || (event.locals.user.role !== 'owner' && event.locals.user.role !== 'admin')) {
			return Response.redirect(new URL('/login?redirect=' + encodeURIComponent(path), event.url), 303);
		}
	}

	return resolve(event);
};
