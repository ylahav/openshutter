import { redirect } from '@sveltejs/kit';
import type { PageServerLoad } from './$types';

/** `/admin/layout` is not the canonical URL — avoid a route segment named like a layout file. */
export const load: PageServerLoad = async () => {
	throw redirect(308, '/admin/theme-layout');
};
