import { json } from '@sveltejs/kit';
import type { RequestHandler } from './$types';
import { backendGet, parseBackendResponse } from '$lib/utils/backend-api';

export const GET: RequestHandler = async ({ params, url }) => {
	try {
		const { alias } = await params;
		const searchParams = url.searchParams;

		// Pagination parameters
		const page = searchParams.get('page') || '1';
		const limit = searchParams.get('limit') || '50';

		if (!alias) {
			return json({ success: false, error: 'Album alias is required' }, { status: 400 });
		}

		// Build query string
		const queryParams = new URLSearchParams();
		queryParams.set('page', page);
		queryParams.set('limit', limit);

		// The backend endpoint /albums/:idOrAlias/data handles both IDs and aliases
		// It uses findOneByIdOrAlias which checks both ID and alias
		const endpoint = `/albums/${alias}/data?${queryParams.toString()}`;
		console.log(`[API] Fetching album data for alias: ${alias} from endpoint: ${endpoint}`);
		const response = await backendGet(endpoint);
		
		if (!response.ok) {
			console.error(`[API] Backend returned error for alias ${alias}:`, response.status, response.statusText);
			
			// Try to get more details about the error
			let errorMessage = 'Album not found';
			try {
				const errorText = await response.text();
				console.error(`[API] Error response body:`, errorText);
				const errorData = JSON.parse(errorText);
				errorMessage = errorData.error || errorData.message || errorMessage;
			} catch (e) {
				// If we can't parse the error, use default message
			}
			
			if (response.status === 404) {
				return json({ success: false, error: errorMessage }, { status: 404 });
			}
			return json({ success: false, error: errorMessage || 'Failed to get album data' }, { status: response.status });
		}

		const albumData = await parseBackendResponse<any>(response);
		return json(albumData);
	} catch (error) {
		console.error('API: Error getting album data by alias:', error);
		const errorMessage = error instanceof Error ? error.message : String(error);
		return json(
			{ success: false, error: `Failed to get album data: ${errorMessage}` },
			{ status: 500 }
		);
	}
};
