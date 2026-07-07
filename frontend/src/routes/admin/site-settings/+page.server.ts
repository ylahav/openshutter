import { redirect } from '@sveltejs/kit';
import type { PageServerLoad } from './$types';

/**
 * /admin/site-settings is the per-owner-site branding page. Admin users don't
 * have their own owner-site to configure (they manage the global site via
 * /admin/site-config), so bounce them back to /admin if they land here.
 */
export const load: PageServerLoad = async ({ locals }) => {
	if (locals.user?.role === 'admin') {
		throw redirect(303, '/admin');
	}
	return {};
};
