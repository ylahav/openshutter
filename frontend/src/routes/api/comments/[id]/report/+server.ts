import { json } from '@sveltejs/kit';
import type { RequestHandler } from './$types';
import { backendPost, parseBackendResponse } from '$lib/utils/backend-api';
import { logger } from '$lib/utils/logger';
import { parseError } from '$lib/utils/errorHandler';

export const POST: RequestHandler = async ({ params, cookies }) => {
	try {
		const { id } = await params;
		const response = await backendPost(`/comments/${encodeURIComponent(id)}/report`, {}, { cookies });
		const data = await parseBackendResponse<any>(response);
		return json(data, { status: response.status });
	} catch (error) {
		logger.error('API: comment report:', error);
		const parsed = parseError(error);
		return json(
			{ error: parsed.userMessage || parsed.message },
			{ status: parsed.status || 500 },
		);
	}
};
