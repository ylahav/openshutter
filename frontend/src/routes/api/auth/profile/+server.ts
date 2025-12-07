import { json } from '@sveltejs/kit';
import type { RequestHandler } from './$types';
import { backendGet, backendPut, parseBackendResponse } from '$lib/utils/backend-api';

export const GET: RequestHandler = async ({ locals, cookies }) => {
	try {
		if (!locals.user) {
			return json({ error: 'Unauthorized' }, { status: 401 });
		}

		const response = await backendGet('/auth/profile', { cookies });
		const result = await parseBackendResponse<{ user: any }>(response);

		return json(result);
	} catch (error) {
		console.error('Error fetching profile:', error);
		const errorMessage = error instanceof Error ? error.message : String(error);
		return json({ error: `Internal server error: ${errorMessage}` }, { status: 500 });
	}
};

export const PUT: RequestHandler = async ({ request, locals, cookies }) => {
	try {
		if (!locals.user) {
			return json({ error: 'Unauthorized' }, { status: 401 });
		}

		const body = await request.json();
		const response = await backendPut('/auth/profile', body, { cookies });
		const result = await parseBackendResponse<{ user: any; message?: string }>(response);

		return json(result);
	} catch (error) {
		console.error('Error updating profile:', error);
		const errorMessage = error instanceof Error ? error.message : String(error);
		return json({ error: `Internal server error: ${errorMessage}` }, { status: 500 });
	}
};
