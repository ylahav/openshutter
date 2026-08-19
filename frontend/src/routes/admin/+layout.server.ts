import type { LayoutServerLoad } from './$types';
import { redirect } from '@sveltejs/kit';
import { backendGet, parseBackendResponse } from '$lib/utils/backend-api';
import { ownerCanAccessAdminPath } from '$lib/server/admin-access';

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
	if (locals.user.role === 'owner' && !ownerCanAccessAdminPath(url.pathname)) {
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
