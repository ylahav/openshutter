import type { LayoutServerLoad } from './$types';
import { redirect } from '@sveltejs/kit';

/** Paths owners can access (same album/photo management as admin; backend enforces ownership). */
function ownerCanAccess(pathname: string): boolean {
	if (pathname.startsWith('/admin/photos/upload')) return true;
	if (/^\/admin\/photos\/[^/]+\/edit\/?$/.test(pathname)) return true;
	if (pathname.startsWith('/admin/albums')) return true;
	return false;
}

export const load: LayoutServerLoad = async ({ locals, url }) => {
	if (!locals.user) {
		throw redirect(303, '/login?redirect=' + encodeURIComponent(url.pathname));
	}
	// Owners: album management and photo upload/edit only; admins: all admin routes
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
