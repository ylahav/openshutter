import { json } from '@sveltejs/kit';
import type { RequestHandler } from './$types';
import { backendGet, parseBackendResponse } from '$lib/utils/backend-api';
import { logger } from '$lib/utils/logger';
import { parseError } from '$lib/utils/errorHandler';

export const GET: RequestHandler = async ({ cookies, request }) => {
	try {
		// Forward the request's Host so the backend can resolve owner-domain context (e.g. sara.localhost:4000)
		const host = request.headers.get('host') || request.headers.get('x-forwarded-host');
		const headers: Record<string, string> = {};
		if (host) headers['X-Forwarded-Host'] = host;

		const response = await backendGet('/site-config', { cookies, headers });
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
