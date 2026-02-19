import { redirect } from '@sveltejs/kit';
import type { PageServerLoad } from './$types';

export const load: PageServerLoad = async ({ locals, url }) => {
	if (!locals.user || (locals.user.role !== 'owner' && locals.user.role !== 'admin')) {
		throw redirect(303, `/login?redirect=${encodeURIComponent(url.pathname)}`);
	}
	return { user: locals.user };
};
