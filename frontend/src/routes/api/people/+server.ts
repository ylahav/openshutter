import { json } from '@sveltejs/kit';
import type { RequestHandler } from './$types';
import { backendGet, backendPost, parseBackendResponse } from '$lib/utils/backend-api';

export const GET: RequestHandler = async ({ url, cookies }) => {
	try {
		const searchParams = url.searchParams;
		
		// Build query string
		const queryParams = new URLSearchParams();
		const search = searchParams.get('search');
		const page = searchParams.get('page') || '1';
		const limit = searchParams.get('limit') || '20';
		const isActive = searchParams.get('isActive');

		if (search) queryParams.set('search', search);
		if (isActive !== null && isActive !== '') queryParams.set('isActive', isActive);
		if (page) queryParams.set('page', page);
		if (limit) queryParams.set('limit', limit);

		const endpoint = `/people${queryParams.toString() ? `?${queryParams.toString()}` : ''}`;
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
		console.error('People API error:', error);
		const errorMessage = error instanceof Error ? error.message : String(error);
		return json({ success: false, error: `Failed to fetch people: ${errorMessage}` }, { status: 500 });
	}
};

export const POST: RequestHandler = async ({ request, locals, cookies }) => {
	try {
		if (!locals.user) {
			return json({ success: false, error: 'Unauthorized' }, { status: 401 });
		}

		const body = await request.json();
		const response = await backendPost('/people', body, { cookies });
		const result = await parseBackendResponse<any>(response);

		return json({
			success: true,
			data: result
		});
	} catch (error) {
		console.error('Create person error:', error);
		const errorMessage = error instanceof Error ? error.message : String(error);
		return json({ success: false, error: `Failed to create person: ${errorMessage}` }, { status: 500 });
	}
};
