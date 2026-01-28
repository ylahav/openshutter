import { json } from '@sveltejs/kit';
import type { RequestHandler } from './$types';
import { backendGet, parseBackendResponse } from '$lib/utils/backend-api';
import { logger } from '$lib/utils/logger';
import { parseError } from '$lib/utils/errorHandler';

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

		logger.debug('[hierarchy endpoint] Backend response:', result);
		
		// Backend returns {data: [...]}, parseBackendResponse extracts it
		// Handle both cases: result is already the data array, or result.data is the array
		const albumsData = Array.isArray(result) ? result : (result?.data || []);
		
		logger.debug('[hierarchy endpoint] Albums data:', albumsData);
		
		return json({
			success: true,
			data: albumsData
		});
	} catch (error) {
		logger.error('Failed to get album hierarchy:', error);
		const parsed = parseError(error);
		return json(
			{ success: false, error: parsed.userMessage || `Failed to get album hierarchy: ${parsed.message}` },
			{ status: parsed.status || 500 }
		);
	}
};
