import { json } from '@sveltejs/kit';
import type { RequestHandler } from './$types';
import { backendGet, parseBackendResponse } from '$lib/utils/backend-api';

export const GET: RequestHandler = async ({ url, cookies }) => {
	try {
		const searchParams = url.searchParams;
		
		// Build query string
		const queryParams = new URLSearchParams();
		const includePrivate = searchParams.get('includePrivate');
		const storageProvider = searchParams.get('storageProvider');

		if (includePrivate === 'true') queryParams.set('includePrivate', 'true');
		if (storageProvider) queryParams.set('storageProvider', storageProvider);

		const endpoint = `/albums/hierarchy${queryParams.toString() ? `?${queryParams.toString()}` : ''}`;
		const response = await backendGet(endpoint, { cookies });
		const result = await parseBackendResponse<any>(response);

		console.log('[hierarchy endpoint] Backend response:', result);
		
		// Backend returns {data: [...]}, parseBackendResponse extracts it
		// Handle both cases: result is already the data array, or result.data is the array
		const albumsData = Array.isArray(result) ? result : (result?.data || []);
		
		console.log('[hierarchy endpoint] Albums data:', albumsData);
		
		return json({
			success: true,
			data: albumsData
		});
	} catch (error) {
		console.error('Failed to get album hierarchy:', error);
		const errorMessage = error instanceof Error ? error.message : String(error);
		return json(
			{ success: false, error: `Failed to get album hierarchy: ${errorMessage}` },
			{ status: 500 }
		);
	}
};
