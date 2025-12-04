// @ts-nocheck
import type { LayoutServerLoad } from './$types';
import { redirect } from '@sveltejs/kit';

export const load = async ({ locals }: Parameters<LayoutServerLoad>[0]) => {
	if (!locals.user || locals.user.role !== 'admin') {
		throw redirect(303, '/login?redirect=' + encodeURIComponent('/admin'));
	}

	return {
		user: locals.user
	};
};

