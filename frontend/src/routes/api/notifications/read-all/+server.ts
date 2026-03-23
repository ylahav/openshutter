import { json } from '@sveltejs/kit';
import type { RequestHandler } from './$types';
import { backendPatch, parseBackendResponse } from '$lib/utils/backend-api';
import { logger } from '$lib/utils/logger';
import { parseError } from '$lib/utils/errorHandler';

export const PATCH: RequestHandler = async ({ cookies }) => {
	try {
		const response = await backendPatch('/notifications/read-all', {}, { cookies });
		const data = await parseBackendResponse<any>(response);
		return json(data, { status: response.status });
	} catch (error) {
		logger.error('API: notifications read-all:', error);
		const parsed = parseError(error);
		return json(
			{ error: parsed.userMessage || parsed.message },
			{ status: parsed.status || 500 },
		);
	}
};
