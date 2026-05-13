import { redirect } from '@sveltejs/kit';
import type { PageServerLoad } from './$types';

/** Legacy URL — canonical is `/admin/theme-layout` (sidebar: Layout). */
export const load: PageServerLoad = async () => {
	throw redirect(308, '/admin/theme-layout');
};
