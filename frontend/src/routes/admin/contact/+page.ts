import { redirect } from '@sveltejs/kit';
import type { PageLoad } from './$types';

/** Canonical URL is `/admin/contact-submissions`. */
export const load: PageLoad = () => {
	throw redirect(308, '/admin/contact-submissions');
};
