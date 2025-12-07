import { json } from '@sveltejs/kit';
import type { RequestHandler } from './$types';
import { backendGet, parseBackendResponse } from '$lib/utils/backend-api';

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
		console.error('Search API error:', error);
		const errorMessage = error instanceof Error ? error.message : String(error);
		return json({ success: false, error: `Search failed: ${errorMessage}` }, { status: 500 });
	}
};
