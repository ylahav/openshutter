import { json } from '@sveltejs/kit';
import type { RequestHandler } from './$types';
import { backendGet, parseBackendResponse } from '$lib/utils/backend-api';
import { logger } from '$lib/utils/logger';
import { parseError } from '$lib/utils/errorHandler';

export const GET: RequestHandler = async ({ params, cookies }) => {
	try {
		const { slug } = params;
		const response = await backendGet(`/blog/${encodeURIComponent(slug)}`, { cookies });
		const data = await parseBackendResponse<{ article: unknown }>(response);
		return json({ success: true, data });
	} catch (error) {
		logger.error('Public blog article API error:', error);
		const parsed = parseError(error);
		return json(
			{ success: false, error: parsed.userMessage || 'Failed to fetch article' },
			{ status: parsed.status || 500 }
		);
	}
};
