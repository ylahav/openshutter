import { json } from '@sveltejs/kit';
import type { RequestHandler } from './$types';
import { backendGet, parseBackendResponse } from '$lib/utils/backend-api';
import { logger } from '$lib/utils/logger';
import { parseError } from '$lib/utils/errorHandler';

export const GET: RequestHandler = async ({ url, cookies }) => {
	try {
		const limit = url.searchParams.get('limit') || '50';
		const response = await backendGet(`/notifications?limit=${encodeURIComponent(limit)}`, { cookies });
		const data = await parseBackendResponse<any>(response);
		return json(data);
	} catch (error) {
		logger.error('API: notifications GET:', error);
		const parsed = parseError(error);
		return json(
			{ error: parsed.userMessage || parsed.message },
			{ status: parsed.status || 500 },
		);
	}
};
