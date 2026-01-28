import { json } from '@sveltejs/kit';
import type { RequestHandler } from './$types';
import { backendGet, backendPost, parseBackendResponse } from '$lib/utils/backend-api';
import { logger } from '$lib/utils/logger';
import { parseError } from '$lib/utils/errorHandler';

export const GET: RequestHandler = async ({ url, locals, cookies }) => {
	try {
		// Require admin access
		if (!locals.user || locals.user.role !== 'admin') {
			return json({ success: false, error: 'Unauthorized' }, { status: 401 });
		}

		const searchParams = url.searchParams;

		// Build query string
		const queryParams = new URLSearchParams();
		const search = searchParams.get('search');
		const page = searchParams.get('page') || '1';
		const limit = searchParams.get('limit') || '20';
		const isActive = searchParams.get('isActive');

		if (search) queryParams.set('search', search);
		if (page) queryParams.set('page', page);
		if (limit) queryParams.set('limit', limit);
		if (isActive !== null) queryParams.set('isActive', isActive);

		const endpoint = `/admin/people${queryParams.toString() ? `?${queryParams.toString()}` : ''}`;
		const response = await backendGet(endpoint, { cookies });
		const result = await parseBackendResponse<{ data: any[]; pagination: any }>(response);

		return json({
			success: true,
			data: result.data || result,
			pagination: result.pagination || {
				page: parseInt(page),
				limit: parseInt(limit),
				total: 0,
				totalPages: 0
			}
		});
	} catch (error) {
		logger.error('Admin People API error:', error);
		const parsed = parseError(error);
		return json({ 
			success: false, 
			error: parsed.userMessage || 'Failed to fetch people' 
		}, { status: parsed.status || 500 });
	}
};

export const POST: RequestHandler = async ({ request, locals, cookies }) => {
	try {
		// Require admin access
		if (!locals.user || locals.user.role !== 'admin') {
			return json({ success: false, error: 'Unauthorized' }, { status: 401 });
		}

		const body = await request.json();

		const response = await backendPost('/admin/people', body, { cookies });
		const person = await parseBackendResponse<any>(response);

		return json({
			success: true,
			data: person
		});
	} catch (error) {
		logger.error('Create person error:', error);
		const parsed = parseError(error);
		return json({ 
			success: false, 
			error: parsed.userMessage || 'Failed to create person' 
		}, { status: parsed.status || 500 });
	}
};
