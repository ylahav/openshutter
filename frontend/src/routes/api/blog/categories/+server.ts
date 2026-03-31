import { json } from '@sveltejs/kit';
import type { RequestHandler } from './$types';
import { backendGet, parseBackendResponse } from '$lib/utils/backend-api';
import { logger } from '$lib/utils/logger';
import { parseError } from '$lib/utils/errorHandler';

export const GET: RequestHandler = async ({ url, cookies }) => {
	try {
		const qs = url.searchParams.toString();
		const path = qs ? `/blog/categories?${qs}` : '/blog/categories';
		const response = await backendGet(path, { cookies });
		const data = await parseBackendResponse<unknown>(response);
		return json({ success: true, data });
	} catch (error) {
		logger.error('Public blog categories API error:', error);
		const parsed = parseError(error);
		return json(
			{ success: false, error: parsed.userMessage || 'Failed to fetch blog categories' },
			{ status: parsed.status || 500 }
		);
	}
};
