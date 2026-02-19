import { redirect } from '@sveltejs/kit';
import type { LayoutServerLoad } from './$types';

export const load: LayoutServerLoad = async ({ locals, url }) => {
	// Developers section: owner and admin only (same as owner panel)
	if (!locals.user || (locals.user.role !== 'owner' && locals.user.role !== 'admin')) {
		throw redirect(303, `/login?redirect=${encodeURIComponent(url.pathname)}`);
	}

	return {
		user: locals.user
	};
};
