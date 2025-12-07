import { json } from '@sveltejs/kit';
import type { RequestHandler } from './$types';
import { backendGet, backendPost, parseBackendResponse } from '$lib/utils/backend-api';

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
		const category = searchParams.get('category');
		const isActive = searchParams.get('isActive');

		if (search) queryParams.set('search', search);
		if (page) queryParams.set('page', page);
		if (limit) queryParams.set('limit', limit);
		if (category) queryParams.set('category', category);
		if (isActive !== null && isActive !== '') queryParams.set('isActive', isActive);

		const endpoint = `/admin/locations${queryParams.toString() ? `?${queryParams.toString()}` : ''}`;
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
		console.error('Admin Locations API error:', error);
		const errorMessage = error instanceof Error ? error.message : String(error);
		return json({ success: false, error: errorMessage || 'Failed to fetch locations' }, { status: 500 });
	}
};

export const POST: RequestHandler = async ({ request, locals, cookies }) => {
	try {
		// Require admin access
		if (!locals.user || locals.user.role !== 'admin') {
			return json({ success: false, error: 'Unauthorized' }, { status: 401 });
		}

		const body = await request.json();

		const response = await backendPost('/admin/locations', body, { cookies });
		const location = await parseBackendResponse<any>(response);

		return json({
			success: true,
			data: location
		});
	} catch (error) {
		console.error('Create location error:', error);
		const errorMessage = error instanceof Error ? error.message : String(error);
		return json({ success: false, error: errorMessage || 'Failed to create location' }, { status: 500 });
	}
};
