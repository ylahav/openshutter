import { redirect } from '@sveltejs/kit';
import type { PageLoad } from './$types';

/** Legacy URL; canonical admin UI is `/admin/import-sync`. */
export const load: PageLoad = () => {
	throw redirect(308, '/admin/import-sync');
};
