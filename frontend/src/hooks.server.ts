import type { Handle } from '@sveltejs/kit';
import { jwtVerify } from 'jose';
import { env } from '$env/dynamic/private';

const JWT_SECRET = new TextEncoder().encode(
	env.AUTH_JWT_SECRET || env.NEXTAUTH_SECRET || process.env.AUTH_JWT_SECRET || process.env.NEXTAUTH_SECRET || 'dev-secret-change-me-in-production'
);

export const handle: Handle = async ({ event, resolve }) => {
	// Default anonymous user
	event.locals.user = null;

	const token = event.cookies.get('auth_token');
	if (token) {
		try {
			const { payload } = await jwtVerify(token, JWT_SECRET);
			event.locals.user = {
				id: String(payload.sub),
				email: String(payload.email),
				name: String(payload.name),
				role: (payload.role as 'admin' | 'owner' | 'guest') ?? 'owner'
			};
		} catch {
			// Invalid/expired token - clear it
			event.cookies.delete('auth_token', { path: '/' });
		}
	}

	// Protect admin routes
	const path = event.url.pathname;
	if (path.startsWith('/admin')) {
		if (!event.locals.user || event.locals.user.role !== 'admin') {
			return Response.redirect(new URL('/login?redirect=' + encodeURIComponent(path), event.url), 303);
		}
	}

	// Protect owner routes (admin can also access)
	if (path.startsWith('/owner')) {
		if (!event.locals.user || (event.locals.user.role !== 'owner' && event.locals.user.role !== 'admin')) {
			return Response.redirect(new URL('/login?redirect=' + encodeURIComponent(path), event.url), 303);
		}
	}

	return resolve(event);
};
