import { json } from '@sveltejs/kit';
import type { RequestHandler } from './$types';
import { backendGet, parseBackendResponse } from '$lib/utils/backend-api';

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
		console.error('API: Error getting album data:', error);
		const errorMessage = error instanceof Error ? error.message : String(error);
		return json(
			{ success: false, error: `Failed to get album data: ${errorMessage}` },
			{ status: 500 }
		);
	}
};
