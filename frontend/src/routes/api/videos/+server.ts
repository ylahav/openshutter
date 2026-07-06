import { json } from '@sveltejs/kit';
import type { RequestHandler } from './$types';
import { backendGet, parseBackendResponse } from '$lib/utils/backend-api';
import { logger } from '$lib/utils/logger';
import { parseError } from '$lib/utils/errorHandler';

/** GET /api/videos?albumId=… → backend GET /videos?albumId=… (returns `{ data: Video[] }`). */
export const GET: RequestHandler = async ({ url, cookies }) => {
	try {
		const albumId = url.searchParams.get('albumId') ?? '';
		const qs = albumId ? `?albumId=${encodeURIComponent(albumId)}` : '';
		const response = await backendGet(`/videos${qs}`, { cookies });
		const data = await parseBackendResponse<{ data: unknown[] }>(response);
		return json(data);
	} catch (error) {
		logger.error('Failed to list videos:', error);
		const parsed = parseError(error);
		return json(
			{ success: false, error: parsed.userMessage || parsed.message },
			{ status: parsed.status || 500 }
		);
	}
};
