import { redirect } from '@sveltejs/kit';
import type { PageServerLoad } from './$types';

export const load: PageServerLoad = async ({ locals, url }) => {
	if (!locals.user) {
		throw redirect(303, '/login?redirect=' + encodeURIComponent(url.pathname + url.search));
	}
	if (!locals.user.forcePasswordChange) {
		const defaultRedirect =
			locals.user.role === 'guest' ? '/member' : locals.user.role === 'owner' ? '/owner' : '/admin';
		const redirectTo = url.searchParams.get('redirect') || defaultRedirect;
		throw redirect(303, redirectTo);
	}
	const defaultRedirect =
		locals.user.role === 'guest' ? '/member' : locals.user.role === 'owner' ? '/owner' : '/admin';
	return {
		user: locals.user,
		redirect: url.searchParams.get('redirect') || defaultRedirect
	};
};
