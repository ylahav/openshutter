import { json } from '@sveltejs/kit';
import type { RequestHandler } from './$types';
import { backendGet, parseBackendResponse } from '$lib/utils/backend-api';

export const GET: RequestHandler = async ({ url }) => {
	try {
		const searchParams = url.searchParams;
		const limit = searchParams.get('limit') || '5';

		const queryParams = new URLSearchParams();
		if (limit) queryParams.set('limit', limit);

		const endpoint = `/photos/gallery-leading${queryParams.toString() ? `?${queryParams.toString()}` : ''}`;
		const response = await backendGet(endpoint);
		const photos = await parseBackendResponse<any[]>(response);

		return json({
			success: true,
			data: photos
		});
	} catch (error) {
		console.error('Failed to get gallery leading photos:', error);
		const errorMessage = error instanceof Error ? error.message : String(error);
		return json(
			{ success: false, error: `Failed to get gallery leading photos: ${errorMessage}` },
			{ status: 500 }
		);
	}
};
