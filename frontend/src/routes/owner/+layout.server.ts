import { redirect } from '@sveltejs/kit';
import type { LayoutServerLoad } from './$types';

export const load: LayoutServerLoad = async ({ locals, url }) => {
	if (!locals.user) {
		throw redirect(303, `/login?redirect=${encodeURIComponent(url.pathname)}`);
	}
	// Admins have their own dashboard at /admin
	if (locals.user.role === 'admin') {
		throw redirect(303, '/admin');
	}
	if (locals.user.role !== 'owner') {
		throw redirect(303, `/login?redirect=${encodeURIComponent(url.pathname)}`);
	}
	const sc = locals.siteContext;
	if (sc.type === 'owner-site' && locals.user.id !== sc.ownerId) {
		throw redirect(303, '/login?wrongSite=1');
	}

	return {
		user: locals.user
	};
};
