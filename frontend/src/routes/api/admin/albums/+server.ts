import { json } from '@sveltejs/kit';
import type { RequestHandler } from './$types';
import { backendGet, parseBackendResponse } from '$lib/utils/backend-api';
import { logger } from '$lib/utils/logger';
import { parseError } from '$lib/utils/errorHandler';

export const GET: RequestHandler = async ({ url, locals, cookies }) => {
	try {
		// Require admin access
		if (!locals.user || locals.user.role !== 'admin') {
			return json({ success: false, error: 'Unauthorized' }, { status: 401 });
		}

		const searchParams = url.searchParams;

		// Build query string (ignore cache-busting parameter 't')
		const queryParams = new URLSearchParams();
		const parentId = searchParams.get('parentId');
		const level = searchParams.get('level');

		if (parentId) queryParams.set('parentId', parentId);
		if (level) queryParams.set('level', level);

		const endpoint = `/admin/albums${queryParams.toString() ? `?${queryParams.toString()}` : ''}`;
		const response = await backendGet(endpoint, { cookies });
		
		logger.debug('[Admin Albums API] Backend response status:', response.status, response.statusText);
		
		const result = await parseBackendResponse(response);
		
		logger.debug('[Admin Albums API] Parsed result:', {
			isArray: Array.isArray(result),
			type: typeof result,
			count: Array.isArray(result) ? result.length : 'N/A'
		});

		// Return the result directly (should be an array)
		return json(result);
	} catch (error) {
		logger.error('Admin Albums API error:', error);
		const parsed = parseError(error);
		return json({ 
			success: false, 
			error: parsed.userMessage || 'Failed to fetch albums' 
		}, { status: parsed.status || 500 });
	}
};
