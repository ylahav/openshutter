import { json } from '@sveltejs/kit';
import type { RequestHandler } from './$types';
import { backendGet, parseBackendResponse } from '$lib/utils/backend-api';
import { logger } from '$lib/utils/logger';
import { parseError } from '$lib/utils/errorHandler';

export const GET: RequestHandler = async ({ params }) => {
	try {
		const { alias } = params;

		if (!alias) {
			return json({ success: false, error: 'Album alias is required' }, { status: 400 });
		}

		// First, get the album by alias to get its ID
		const albumResponse = await backendGet(`/albums/by-alias/${alias}`);
		if (!albumResponse.ok) {
			return json({ success: false, error: 'Album not found' }, { status: 404 });
		}

		const album = await parseBackendResponse<any>(albumResponse);
		
		// Get photo count from the album data endpoint
		// Note: The backend doesn't have a dedicated photo-count endpoint,
		// so we'll use the album data endpoint which includes photo information
		const albumDataResponse = await backendGet(`/albums/${album._id}/data?limit=1`);
		if (!albumDataResponse.ok) {
			return json({ success: false, error: 'Failed to get album data' }, { status: 500 });
		}

		const albumData = await parseBackendResponse<any>(albumDataResponse);
		
		// Return photo count information
		return json({
			success: true,
			data: {
				directPhotoCount: albumData.photos?.length || 0,
				totalPhotoCount: albumData.pagination?.total || 0,
				childAlbumCount: albumData.subAlbums?.length || 0
			}
		});
	} catch (error) {
		logger.error('Error getting album photo count:', error);
		const parsed = parseError(error);
		return json(
			{ success: false, error: parsed.userMessage || `Failed to get album photo count: ${parsed.message}` },
			{ status: parsed.status || 500 }
		);
	}
};
