import { redirect } from '@sveltejs/kit';
import type { LayoutServerLoad } from './$types';

export const load: LayoutServerLoad = async ({ locals, url }) => {
	// Owner routes are protected in hooks.server.ts, but we can add additional checks here if needed
	if (!locals.user || (locals.user.role !== 'owner' && locals.user.role !== 'admin')) {
		throw redirect(303, `/login?redirect=${encodeURIComponent(url.pathname)}`);
	}

	return {
		user: locals.user
	};
};
