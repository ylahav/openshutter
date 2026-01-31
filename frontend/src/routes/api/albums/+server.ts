import { json } from '@sveltejs/kit';
import type { RequestHandler } from './$types';
import { backendGet, backendPost, parseBackendResponse } from '$lib/utils/backend-api';
import { logger } from '$lib/utils/logger';
import { parseError } from '$lib/utils/errorHandler';

export const GET: RequestHandler = async ({ url, cookies }) => {
	try {
		const searchParams = url.searchParams;
		const parentId = searchParams.get('parentId');
		const level = searchParams.get('level');
		const mine = searchParams.get('mine');

		// Build query string
		const queryParams = new URLSearchParams();
		if (parentId) queryParams.set('parentId', parentId);
		if (level) queryParams.set('level', level);
		if (mine) queryParams.set('mine', mine);

		const queryString = queryParams.toString();
		const endpoint = `/albums${queryString ? `?${queryString}` : ''}`;

		// Forward cookies so backend can apply group/user access for logged-in users (e.g. guest)
		const response = await backendGet(endpoint, { cookies });
		const albums = await parseBackendResponse<any[]>(response);

		return json(albums);
	} catch (error) {
		logger.error('Failed to get albums:', error);
		const parsed = parseError(error);
		return json(
			{ success: false, error: parsed.userMessage || `Failed to get albums: ${parsed.message}` },
			{ status: parsed.status || 500 }
		);
	}
};

export const POST: RequestHandler = async ({ request, cookies }) => {
	logger.debug('[POST /api/albums] Request received');
	try {
		const body = await request.json();
		logger.debug('[POST /api/albums] Body:', JSON.stringify(body, null, 2));
		
		// Proxy to backend /albums (allows both owner and admin; /admin/albums is admin-only)
		logger.debug('[POST /api/albums] Proxying to backend /albums');
		const response = await backendPost('/albums', body, { cookies });
		
		logger.debug('[POST /api/albums] Backend response status:', response.status, response.statusText);
		
		if (!response.ok) {
			// Handle error response
			const errorData = await response.json().catch(() => ({ message: 'Request failed' }));
			logger.error('[POST /api/albums] Backend returned error:', errorData);
			return json(
				{ 
					success: false, 
					error: errorData.message || errorData.error || `HTTP ${response.status}: ${response.statusText}` 
				},
				{ status: response.status }
			);
		}
		
		const result = await parseBackendResponse<any>(response);
		logger.debug('[POST /api/albums] Parsed backend response:', result);
		
		// parseBackendResponse extracts data.data when success is present
		// So result is the album object, we need to wrap it
		logger.debug('[POST /api/albums] Wrapping response with success field');
		return json({
			success: true,
			data: result
		});
	} catch (error) {
		logger.error('[POST /api/albums] Failed to create album:', error);
		const parsed = parseError(error);
		return json(
			{ success: false, error: parsed.userMessage || `Failed to create album: ${parsed.message}` },
			{ status: parsed.status || 500 }
		);
	}
};
