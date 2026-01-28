import { json } from '@sveltejs/kit';
import type { RequestHandler } from './$types';
import { backendGet, parseBackendResponse } from '$lib/utils/backend-api';
import { logger } from '$lib/utils/logger';
import { parseError } from '$lib/utils/errorHandler';

export const GET: RequestHandler = async ({ params, url }) => {
	try {
		const { idOrAlias } = await params;
		const searchParams = url.searchParams;

		// Pagination parameters
		const page = searchParams.get('page') || '1';
		const limit = searchParams.get('limit') || '50';

		// Build query string
		const queryParams = new URLSearchParams();
		queryParams.set('page', page);
		queryParams.set('limit', limit);

		const endpoint = `/albums/${idOrAlias}/data?${queryParams.toString()}`;
		const response = await backendGet(endpoint);
		const albumData = await parseBackendResponse<any>(response);

		return json(albumData);
	} catch (error) {
		logger.error('API: Error getting album data:', error);
		const parsed = parseError(error);
		return json(
			{ success: false, error: parsed.userMessage || `Failed to get album data: ${parsed.message}` },
			{ status: parsed.status || 500 }
		);
	}
};
