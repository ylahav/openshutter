import { json } from '@sveltejs/kit';
import type { RequestHandler } from './$types';
import { backendGet, parseBackendResponse } from '$lib/utils/backend-api';
import { logger } from '$lib/utils/logger';
import { parseError } from '$lib/utils/errorHandler';

/** GET /api/admin/owner-dedicated-storage?ownerId= -> backend GET /admin/owner-dedicated-storage */
export const GET: RequestHandler = async ({ url, cookies }) => {
	try {
		const searchParams = url.searchParams.toString();
		const endpoint = `/admin/owner-dedicated-storage${searchParams ? `?${searchParams}` : ''}`;
		const response = await backendGet(endpoint, { cookies });
		const data = await parseBackendResponse<any>(response);
		return json(data);
	} catch (error) {
		logger.error('Failed to load owner dedicated storage:', error);
		const parsed = parseError(error);
		return json(
			{ error: parsed.userMessage || 'Failed to load owner dedicated storage' },
			{ status: parsed.status || 500 },
		);
	}
};
