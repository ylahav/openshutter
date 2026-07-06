import { redirect } from '@sveltejs/kit';
import type { PageServerLoad } from './$types';

/**
 * Legacy standalone video upload page. Videos are now uploaded through the
 * unified media upload page at /admin/photos/upload (which detects MP4 files
 * and routes them through the videos endpoint).
 */
export const load: PageServerLoad = async ({ url }) => {
	throw redirect(303, '/admin/photos/upload' + url.search);
};
