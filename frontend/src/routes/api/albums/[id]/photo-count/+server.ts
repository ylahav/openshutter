import { json } from '@sveltejs/kit';
import type { RequestHandler } from './$types';
import { backendGet, parseBackendResponse } from '$lib/utils/backend-api';

export const GET: RequestHandler = async ({ params }) => {
	try {
		const { id } = await params;

		if (!id) {
			return json({ success: false, error: 'Album ID is required' }, { status: 400 });
		}

		// Get album data which includes photo count information
		const albumDataResponse = await backendGet(`/albums/${id}/data?limit=1`);
		if (!albumDataResponse.ok) {
			return json({ success: false, error: 'Album not found' }, { status: 404 });
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
		console.error('Error getting album photo count:', error);
		const errorMessage = error instanceof Error ? error.message : String(error);
		return json(
			{ success: false, error: `Failed to get album photo count: ${errorMessage}` },
			{ status: 500 }
		);
	}
};
