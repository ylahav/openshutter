import { json } from '@sveltejs/kit';
import type { RequestHandler } from './$types';
import { backendGet, parseBackendResponse } from '$lib/utils/backend-api';

export const GET: RequestHandler = async ({ params, url }) => {
	try {
		const { alias } = await params;
		const searchParams = url.searchParams;

		// Pagination parameters
		const page = searchParams.get('page') || '1';
		const limit = searchParams.get('limit') || '16';

		if (!alias) {
			return json({ success: false, error: 'Album alias is required' }, { status: 400 });
		}

		// First, get the album by alias to get its ID
		const albumResponse = await backendGet(`/albums/by-alias/${alias}`);
		if (!albumResponse.ok) {
			return json({ success: false, error: 'Album not found' }, { status: 404 });
		}

		const album = await parseBackendResponse<any>(albumResponse);

		// Get photos for this album using the album data endpoint
		const queryParams = new URLSearchParams();
		queryParams.set('page', page);
		queryParams.set('limit', limit);

		const photosResponse = await backendGet(`/albums/${album._id}/photos?${queryParams.toString()}`);
		if (!photosResponse.ok) {
			return json({ success: false, error: 'Failed to get photos' }, { status: 500 });
		}

		const photosData = await parseBackendResponse<any>(photosResponse);

		return json({
			success: true,
			data: photosData.photos || [],
			pagination: photosData.pagination || {
				page: parseInt(page),
				limit: parseInt(limit),
				total: 0,
				totalPages: 0,
				hasNextPage: false,
				hasPrevPage: false
			}
		});
	} catch (error) {
		console.error('API: Error getting photos by album alias:', error);
		const errorMessage = error instanceof Error ? error.message : String(error);
		return json({ success: false, error: `Failed to get photos: ${errorMessage}` }, { status: 500 });
	}
};
