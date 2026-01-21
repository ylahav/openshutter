import type { LayoutServerLoad } from './$types';
import { redirect } from '@sveltejs/kit';

export const load: LayoutServerLoad = async ({ locals, url }) => {
	if (!locals.user || locals.user.role !== 'admin') {
		throw redirect(303, '/login?redirect=' + encodeURIComponent(url.pathname));
	}

	return {
		user: locals.user
	};
};
