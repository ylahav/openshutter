import type { LayoutServerLoad } from './$types';
import { redirect } from '@sveltejs/kit';

export const load: LayoutServerLoad = async ({ locals }) => {
	if (!locals.user || !['admin', 'owner'].includes(locals.user.role)) {
		throw redirect(303, '/login?redirect=' + encodeURIComponent('/owner'));
	}

	return {
		user: locals.user
	};
};
