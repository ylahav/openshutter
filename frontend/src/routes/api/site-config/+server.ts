import { json } from '@sveltejs/kit';
import type { RequestHandler } from './$types';
import { backendGet, parseBackendResponse } from '$lib/utils/backend-api';
import { logger } from '$lib/utils/logger';
import { parseError } from '$lib/utils/errorHandler';

export const GET: RequestHandler = async ({ cookies }) => {
	try {
		// Fetch from the backend public endpoint
		const response = await backendGet('/site-config', { cookies });
		const config = await parseBackendResponse<any>(response);

		return json(config);
	} catch (error) {
		logger.error('Failed to get site config:', error);
		const parsed = parseError(error);
		return json({ 
			error: parsed.userMessage || `Failed to get site configuration: ${parsed.message}` 
		}, { status: parsed.status || 500 });
	}
};
