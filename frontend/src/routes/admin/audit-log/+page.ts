import { redirect } from '@sveltejs/kit';
import type { PageLoad } from './$types';

/** Canonical URL is `/admin/audit-logs`. */
export const load: PageLoad = () => {
	throw redirect(308, '/admin/audit-logs');
};
