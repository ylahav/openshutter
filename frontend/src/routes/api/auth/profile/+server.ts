import { json } from '@sveltejs/kit';
import type { RequestHandler } from './$types';
import { backendGet, backendPut, parseBackendResponse } from '$lib/utils/backend-api';
import { logger } from '$lib/utils/logger';
import { parseError } from '$lib/utils/errorHandler';

export const GET: RequestHandler = async ({ locals, cookies }) => {
	try {
		if (!locals.user) {
			return json({ error: 'Unauthorized' }, { status: 401 });
		}

		const response = await backendGet('/auth/profile', { cookies });
		const result = await parseBackendResponse<{ user: any }>(response);

		return json(result);
	} catch (error) {
		logger.error('Error fetching profile:', error);
		const parsed = parseError(error);
		return json({ 
			error: parsed.userMessage || `Internal server error: ${parsed.message}` 
		}, { status: parsed.status || 500 });
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
		logger.error('Error updating profile:', error);
		const parsed = parseError(error);
		return json({ 
			error: parsed.userMessage || `Internal server error: ${parsed.message}` 
		}, { status: parsed.status || 500 });
	}
};
