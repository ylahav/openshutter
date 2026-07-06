import type { Handle } from '@sveltejs/kit';
import { jwtVerify } from 'jose';
import { env } from '$env/dynamic/private';
import { resolveSiteContext } from '$lib/server/site-context';

// Simple static JWT secret - matches backend
// Frontend only uses this for UI state (showing user info)
// Backend handles all authentication enforcement
function getJWTSecret(): Uint8Array {
	const baseSecret = env.AUTH_JWT_SECRET || process.env.AUTH_JWT_SECRET;
	if (!baseSecret) {
		throw new Error('AUTH_JWT_SECRET environment variable must be set');
	}
	return new TextEncoder().encode(baseSecret);
}

const JWT_SECRET = getJWTSecret();

export const handle: Handle = async ({ event, resolve }) => {
	// Default anonymous user - this is just for UI state
	// Backend handles all authentication enforcement
	event.locals.user = null;
	event.locals.siteContext = { type: 'global' };

	const token = event.cookies.get('auth_token');
	
	if (token) {
		try {
			// Verify token for UI state only - backend handles auth enforcement
			const { payload } = await jwtVerify(token, JWT_SECRET);
			event.locals.user = {
				id: String(payload.sub),
				email: String(payload.email),
				name: String(payload.name),
				role: (payload.role as 'admin' | 'owner' | 'guest') ?? 'owner',
				forcePasswordChange: Boolean(payload.forcePasswordChange)
			};
		} catch {
			// Invalid/expired token - clear it
			// Don't log errors here - backend will handle authentication
			event.cookies.delete('auth_token', { path: '/' });
		}
	}

	event.locals.siteContext = await resolveSiteContext(event.cookies, event.request);

	// Force password change: authenticated user with forcePasswordChange must go to change-password page first
	const path = event.url.pathname;
	const isPageRequest = !path.startsWith('/api/') && !path.startsWith('/_');
	if (event.locals.user?.forcePasswordChange && isPageRequest && path !== '/auth/change-password-required' && path !== '/login') {
		const redirectUrl = new URL('/auth/change-password-required', event.url);
		redirectUrl.searchParams.set('redirect', path);
		return Response.redirect(redirectUrl, 303);
	}

	// For page routes, still check authentication (backend handles API routes)
	if (path.startsWith('/admin') && !path.startsWith('/api/')) {
		const sc = event.locals.siteContext;
		if (sc.type === 'owner-site' && event.locals.user) {
			if (event.locals.user.role === 'admin') {
				return Response.redirect(new URL('/', event.url), 303);
			}
			if (event.locals.user.role === 'owner' && event.locals.user.id !== sc.ownerId) {
				event.cookies.delete('auth_token', { path: '/' });
				event.locals.user = null;
				return Response.redirect(new URL('/login?wrongSite=1', event.url), 303);
			}
		}
		if (!event.locals.user) {
			return Response.redirect(new URL('/login?redirect=' + encodeURIComponent(path), event.url), 303);
		}
		// Owners (Editor role): content + templating routes. System-level pages
		// (users, groups, site-config, backup-restore, audit-logs, marketplace, modules,
		// translations, import-sync, docs) stay admin-only. Backend guards enforce
		// ownership on writes and keep destructive/system ops on AdminGuard.
		const ownerAllowed =
			path === '/admin' ||
			path === '/admin/' ||
			path.startsWith('/admin/albums') ||
			path.startsWith('/admin/photos/upload') ||
			/^\/admin\/photos\/[^/]+\/edit\/?$/.test(path) ||
			path.startsWith('/admin/videos') ||
			path.startsWith('/admin/storage') ||
			path.startsWith('/admin/tags') ||
			path.startsWith('/admin/people') ||
			path.startsWith('/admin/locations') ||
			path.startsWith('/admin/blog') ||
			path.startsWith('/admin/contact-submissions') ||
			path.startsWith('/admin/analytics') ||
			path.startsWith('/admin/pages') ||
			path.startsWith('/admin/templates') ||
			path.startsWith('/admin/theme-layout') ||
			path.startsWith('/admin/theme') ||
			path.startsWith('/admin/site-settings') ||
			path.startsWith('/admin/profile');
		if (event.locals.user.role === 'owner' && !ownerAllowed) {
			// Authenticated Editor hitting an admin-only route: bounce to the admin home, not login.
			return Response.redirect(new URL('/admin', event.url), 303);
		}
		if (event.locals.user.role !== 'admin' && event.locals.user.role !== 'owner') {
			return Response.redirect(new URL('/login?redirect=' + encodeURIComponent(path), event.url), 303);
		}
	}

	// Legacy /owner/* URLs — the whole /owner section has been folded into /admin.
	// Map each known path to its /admin counterpart; unknown paths fall through to /admin.
	if (path.startsWith('/owner') && !path.startsWith('/api/')) {
		const suffix = path.slice('/owner'.length); // '' | '/albums' | '/profile' | …
		let dest = '/admin';
		if (suffix === '' || suffix === '/') dest = '/admin';
		else if (suffix.startsWith('/albums')) dest = '/admin' + suffix;
		else if (suffix.startsWith('/photos')) dest = '/admin' + suffix;
		else if (suffix === '/analytics') dest = '/admin/analytics';
		else if (suffix === '/storage') dest = '/admin/storage';
		else if (suffix === '/blog') dest = '/admin/blogs';
		else if (suffix === '/blog/new') dest = '/admin/blog-articles/new';
		else if (suffix === '/profile') dest = '/admin/profile';
		else if (suffix === '/site-settings') dest = '/admin/site-settings';
		else if (suffix === '/theme') dest = '/admin/theme';
		return Response.redirect(new URL(dest + event.url.search, event.url), 303);
	}

	// Member area: for users with role "guest" (displayed as "Viewer") – portfolio & change password
	if (path.startsWith('/member') && !path.startsWith('/api/')) {
		if (!event.locals.user) {
			return Response.redirect(new URL('/login?redirect=' + encodeURIComponent(path), event.url), 303);
		}
		if (event.locals.user.role !== 'guest' && event.locals.user.role !== 'admin') {
			// Owners (Editor) and non-members go to the admin dashboard
			return Response.redirect(new URL('/admin', event.url), 303);
		}
	}

	return resolve(event);
};
