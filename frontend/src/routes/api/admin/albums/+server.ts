import { json } from '@sveltejs/kit';
import type { RequestHandler } from './$types';
import { backendGet, parseBackendResponse } from '$lib/utils/backend-api';

export const GET: RequestHandler = async ({ url, locals, cookies }) => {
	try {
		// Require admin access
		if (!locals.user || locals.user.role !== 'admin') {
			return json({ success: false, error: 'Unauthorized' }, { status: 401 });
		}

		const searchParams = url.searchParams;

		// Build query string
		const queryParams = new URLSearchParams();
		const parentId = searchParams.get('parentId');
		const level = searchParams.get('level');

		if (parentId) queryParams.set('parentId', parentId);
		if (level) queryParams.set('level', level);

		const endpoint = `/admin/albums${queryParams.toString() ? `?${queryParams.toString()}` : ''}`;
		const response = await backendGet(endpoint, { cookies });
		
		console.log('[Admin Albums API] Backend response status:', response.status, response.statusText);
		
		const result = await parseBackendResponse(response);
		
		console.log('[Admin Albums API] Parsed result:', {
			isArray: Array.isArray(result),
			type: typeof result,
			count: Array.isArray(result) ? result.length : 'N/A'
		});

		// Return the result directly (should be an array)
		return json(result);
	} catch (error) {
		console.error('Admin Albums API error:', error);
		const errorMessage = error instanceof Error ? error.message : String(error);
		return json({ success: false, error: errorMessage || 'Failed to fetch albums' }, { status: 500 });
	}
};
