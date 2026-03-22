import type { LayoutServerLoad } from './$types';
import { redirect } from '@sveltejs/kit';
import { backendGet, parseBackendResponse } from '$lib/utils/backend-api';

/** Paths owners can access (same album/photo management as admin; backend enforces ownership). */
function ownerCanAccess(pathname: string): boolean {
	if (pathname.startsWith('/admin/photos/upload')) return true;
	if (/^\/admin\/photos\/[^/]+\/edit\/?$/.test(pathname)) return true;
	if (pathname.startsWith('/admin/albums')) return true;
	if (pathname.startsWith('/admin/storage')) return true;
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
	// Owners visiting /admin/storage: redirect to /owner only when "Use main domain connection" is set
	if (locals.user.role === 'owner' && url.pathname.startsWith('/admin/storage')) {
		try {
			const response = await backendGet('/auth/profile', { cookies });
			const result = await parseBackendResponse<{ user?: { storageConfig?: { useAdminConfig?: boolean } }; storageConfig?: { useAdminConfig?: boolean } }>(response);
			const profile = result?.user ?? result;
			if (profile?.storageConfig?.useAdminConfig === true) {
				throw redirect(303, '/owner');
			}
		} catch (e) {
			if (e && typeof e === 'object' && 'status' in e && (e as { status: number }).status === 303) throw e;
			// On profile fetch error, allow access (don't redirect)
		}
	}
	// Owners: album management, photo upload/edit, and storage; admins: all admin routes
	if (locals.user.role === 'owner' && !ownerCanAccess(url.pathname)) {
		throw redirect(303, '/login?redirect=' + encodeURIComponent(url.pathname));
	}
	if (locals.user.role !== 'admin' && locals.user.role !== 'owner') {
		throw redirect(303, '/login?redirect=' + encodeURIComponent(url.pathname));
	}

	return {
		user: locals.user
	};
};
