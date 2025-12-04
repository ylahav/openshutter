// @ts-nocheck
import type { LayoutServerLoad } from './$types';
import { redirect } from '@sveltejs/kit';

export const load = async ({ locals }: Parameters<LayoutServerLoad>[0]) => {
	if (!locals.user || !['admin', 'owner'].includes(locals.user.role)) {
		throw redirect(303, '/login?redirect=' + encodeURIComponent('/owner'));
	}

	return {
		user: locals.user
	};
};
