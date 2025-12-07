import { json } from '@sveltejs/kit';
import type { RequestHandler } from './$types';
import { backendGet, parseBackendResponse } from '$lib/utils/backend-api';

export const GET: RequestHandler = async ({ url }) => {
	try {
		const searchParams = url.searchParams;
		const parentId = searchParams.get('parentId');
		const level = searchParams.get('level');

		// Build query string
		const queryParams = new URLSearchParams();
		if (parentId) queryParams.set('parentId', parentId);
		if (level) queryParams.set('level', level);

		const queryString = queryParams.toString();
		const endpoint = `/albums${queryString ? `?${queryString}` : ''}`;

		const response = await backendGet(endpoint);
		const albums = await parseBackendResponse<any[]>(response);

		return json(albums);
	} catch (error) {
		console.error('Failed to get albums:', error);
		const errorMessage = error instanceof Error ? error.message : String(error);
		return json(
			{ success: false, error: `Failed to get albums: ${errorMessage}` },
			{ status: 500 }
		);
	}
};
