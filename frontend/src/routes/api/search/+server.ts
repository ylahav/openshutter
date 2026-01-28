import { json } from '@sveltejs/kit';
import type { RequestHandler } from './$types';
import { backendGet, parseBackendResponse } from '$lib/utils/backend-api';
import { logger } from '$lib/utils/logger';
import { parseError } from '$lib/utils/errorHandler';

export const GET: RequestHandler = async ({ url, cookies }) => {
	try {
		const searchParams = url.searchParams;
		
		// Build query string - pass all search parameters to backend
		const queryParams = new URLSearchParams();
		
		// Copy all query parameters
		for (const [key, value] of searchParams.entries()) {
			queryParams.set(key, value);
		}

		const endpoint = `/search${queryParams.toString() ? `?${queryParams.toString()}` : ''}`;
		const response = await backendGet(endpoint, { cookies });
		const result = await parseBackendResponse<{ data: any }>(response);

		return json({
			success: true,
			data: result.data || result
		});
	} catch (error) {
		logger.error('Search API error:', error);
		const parsed = parseError(error);
		return json({ 
			success: false, 
			error: parsed.userMessage || `Search failed: ${parsed.message}` 
		}, { status: parsed.status || 500 });
	}
};
