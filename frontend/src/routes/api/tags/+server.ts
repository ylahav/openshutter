import { json } from '@sveltejs/kit';
import type { RequestHandler } from './$types';
import { backendGet, backendPost, parseBackendResponse } from '$lib/utils/backend-api';
import { logger } from '$lib/utils/logger';
import { parseError } from '$lib/utils/errorHandler';

export const GET: RequestHandler = async ({ url, cookies }) => {
	try {
		const searchParams = url.searchParams;
		
		// Build query string
		const queryParams = new URLSearchParams();
		const search = searchParams.get('search');
		const page = searchParams.get('page') || '1';
		const limit = searchParams.get('limit') || '20';
		const category = searchParams.get('category');
		const isActive = searchParams.get('isActive');
		const sortBy = searchParams.get('sortBy') || 'usageCount';
		const sortOrder = searchParams.get('sortOrder') || 'desc';

		if (search) queryParams.set('search', search);
		if (category) queryParams.set('category', category);
		if (isActive !== null && isActive !== '') queryParams.set('isActive', isActive);
		if (page) queryParams.set('page', page);
		if (limit) queryParams.set('limit', limit);
		if (sortBy) queryParams.set('sortBy', sortBy);
		if (sortOrder) queryParams.set('sortOrder', sortOrder);

		const endpoint = `/tags${queryParams.toString() ? `?${queryParams.toString()}` : ''}`;
		const response = await backendGet(endpoint, { cookies });
		const result = await parseBackendResponse<{ data: any[]; pagination: any }>(response);

		return json({
			success: true,
			data: result.data || result,
			pagination: result.pagination || {
				page: parseInt(page),
				limit: parseInt(limit),
				total: 0,
				pages: 0
			}
		});
	} catch (error) {
		logger.error('Tags API error:', error);
		const parsed = parseError(error);
		return json({ 
			success: false, 
			error: parsed.userMessage || `Failed to fetch tags: ${parsed.message}` 
		}, { status: parsed.status || 500 });
	}
};

export const POST: RequestHandler = async ({ request, locals, cookies }) => {
	try {
		if (!locals.user) {
			return json({ success: false, error: 'Unauthorized' }, { status: 401 });
		}

		const body = await request.json();
		const response = await backendPost('/tags', body, { cookies });
		const result = await parseBackendResponse<any>(response);

		return json({
			success: true,
			data: result
		});
	} catch (error) {
		logger.error('Create tag error:', error);
		const parsed = parseError(error);
		return json({ 
			success: false, 
			error: parsed.userMessage || `Failed to create tag: ${parsed.message}` 
		}, { status: parsed.status || 500 });
	}
};
