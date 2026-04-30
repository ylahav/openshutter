import { json } from '@sveltejs/kit';
import type { RequestHandler } from './$types';
import { backendGet, parseBackendResponse } from '$lib/utils/backend-api';
import { forwardedHostHeadersFromRequest } from '$lib/server/forward-host';
import { logger } from '$lib/utils/logger';
import { parseError } from '$lib/utils/errorHandler';

export const GET: RequestHandler = async ({ url, request }) => {
	try {
		const searchParams = url.searchParams;
		const limit = searchParams.get('limit') || '5';

		const queryParams = new URLSearchParams();
		if (limit) queryParams.set('limit', limit);

		const endpoint = `/photos/gallery-leading${queryParams.toString() ? `?${queryParams.toString()}` : ''}`;
		const headers = forwardedHostHeadersFromRequest(request);
		logger.warn('[api] gallery-leading SvelteKit handler (dev: often bypassed by Vite proxy to Nest)', {
			limit,
			'X-Forwarded-Host': headers['X-Forwarded-Host'] ?? null
		});
		const response = await backendGet(endpoint, { headers });
		const photos = await parseBackendResponse<any[]>(response);

		return json({
			success: true,
			data: photos
		});
	} catch (error) {
		logger.error('Failed to get gallery leading photos:', error);
		const parsed = parseError(error);
		return json(
			{ success: false, error: parsed.userMessage || `Failed to get gallery leading photos: ${parsed.message}` },
			{ status: parsed.status || 500 }
		);
	}
};
