import { json } from '@sveltejs/kit';
import type { RequestHandler } from './$types';
import { backendGet, backendPost, parseBackendResponse } from '$lib/utils/backend-api';

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

export const POST: RequestHandler = async ({ request, cookies }) => {
	console.log('[POST /api/albums] Request received');
	try {
		const body = await request.json();
		console.log('[POST /api/albums] Body:', JSON.stringify(body, null, 2));
		
		// Proxy to backend admin albums endpoint
		console.log('[POST /api/albums] Proxying to backend /admin/albums');
		const response = await backendPost('/admin/albums', body, { cookies });
		
		console.log('[POST /api/albums] Backend response status:', response.status, response.statusText);
		
		if (!response.ok) {
			// Handle error response
			const errorData = await response.json().catch(() => ({ message: 'Request failed' }));
			console.error('[POST /api/albums] Backend returned error:', errorData);
			return json(
				{ 
					success: false, 
					error: errorData.message || errorData.error || `HTTP ${response.status}: ${response.statusText}` 
				},
				{ status: response.status }
			);
		}
		
		const result = await parseBackendResponse<any>(response);
		console.log('[POST /api/albums] Parsed backend response:', result);
		
		// parseBackendResponse extracts data.data when success is present
		// So result is the album object, we need to wrap it
		console.log('[POST /api/albums] Wrapping response with success field');
		return json({
			success: true,
			data: result
		});
	} catch (error) {
		console.error('[POST /api/albums] Failed to create album:', error);
		const errorMessage = error instanceof Error ? error.message : String(error);
		return json(
			{ success: false, error: `Failed to create album: ${errorMessage}` },
			{ status: 500 }
		);
	}
};
