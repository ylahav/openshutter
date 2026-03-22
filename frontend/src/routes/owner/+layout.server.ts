import { redirect } from '@sveltejs/kit';
import type { LayoutServerLoad } from './$types';

export const load: LayoutServerLoad = async ({ locals, url }) => {
	// Owner routes are protected in hooks.server.ts, but we can add additional checks here if needed
	if (!locals.user || (locals.user.role !== 'owner' && locals.user.role !== 'admin')) {
		throw redirect(303, `/login?redirect=${encodeURIComponent(url.pathname)}`);
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

	return {
		user: locals.user
	};
};
