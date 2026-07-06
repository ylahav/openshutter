import type { LayoutServerLoad } from './$types';
import { redirect } from '@sveltejs/kit';
import { backendGet, parseBackendResponse } from '$lib/utils/backend-api';

/**
 * Paths owners (Editor role) can access.
 * Everything content + templating; system-level pages (users, groups, site-config, backup-restore,
 * audit-logs, marketplace, modules, translations, import-sync, docs) stay admin-only.
 * Backend must still enforce ownership on write endpoints and keep destructive/system ops on AdminGuard.
 */
function ownerCanAccess(pathname: string): boolean {
	if (pathname === '/admin' || pathname === '/admin/') return true;
	if (pathname.startsWith('/admin/albums')) return true;
	if (pathname.startsWith('/admin/photos/upload')) return true;
	if (/^\/admin\/photos\/[^/]+\/edit\/?$/.test(pathname)) return true;
	if (pathname.startsWith('/admin/videos')) return true;
	if (pathname.startsWith('/admin/storage')) return true;
	if (pathname.startsWith('/admin/tags')) return true;
	if (pathname.startsWith('/admin/people')) return true;
	if (pathname.startsWith('/admin/locations')) return true;
	if (pathname.startsWith('/admin/blog')) return true;
	if (pathname.startsWith('/admin/contact-submissions')) return true;
	if (pathname.startsWith('/admin/analytics')) return true;
	if (pathname.startsWith('/admin/pages')) return true;
	if (pathname.startsWith('/admin/templates')) return true;
	if (pathname.startsWith('/admin/theme-layout')) return true;
	if (pathname.startsWith('/admin/theme')) return true;
	if (pathname.startsWith('/admin/site-settings')) return true;
	if (pathname.startsWith('/admin/profile')) return true;
	return false;
}

export const load: LayoutServerLoad = async ({ locals, url, cookies }) => {
	if (!locals.user) {
		throw redirect(303, '/login?redirect=' + encodeURIComponent(url.pathname));
	}
	const sc = locals.siteContext;
	if (sc.type === 'owner-site') {
		if (locals.user.role === 'admin') {
			throw redirect(303, '/');
		}
		if (locals.user.role === 'owner' && locals.user.id !== sc.ownerId) {
			throw redirect(303, '/login?wrongSite=1');
		}
	}
	// Owners visiting /admin/storage: redirect to /admin only when "Use main domain connection" is set
	// (their storage is fully delegated; the storage settings page has nothing to configure).
	if (locals.user.role === 'owner' && url.pathname.startsWith('/admin/storage')) {
		try {
			const response = await backendGet('/auth/profile', { cookies });
			const result = await parseBackendResponse<{ user?: { storageConfig?: { useAdminConfig?: boolean } }; storageConfig?: { useAdminConfig?: boolean } }>(response);
			const profile = result?.user ?? result;
			if (profile?.storageConfig?.useAdminConfig === true) {
				throw redirect(303, '/admin');
			}
		} catch (e) {
			if (e && typeof e === 'object' && 'status' in e && (e as { status: number }).status === 303) throw e;
			// On profile fetch error, allow access (don't redirect)
		}
	}
	// Owners: album management, photo upload/edit, and storage; admins: all admin routes
	if (locals.user.role === 'owner' && !ownerCanAccess(url.pathname)) {
		// Authenticated Editor hitting an admin-only route: bounce to the admin home, not login.
		throw redirect(303, '/admin');
	}
	if (locals.user.role !== 'admin' && locals.user.role !== 'owner') {
		throw redirect(303, '/login?redirect=' + encodeURIComponent(url.pathname));
	}

	return {
		user: locals.user
	};
};
