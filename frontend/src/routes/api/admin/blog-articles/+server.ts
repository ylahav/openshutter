import { json } from '@sveltejs/kit';
import type { RequestHandler } from './$types';
import { backendGet, backendPost, parseBackendResponse } from '$lib/utils/backend-api';
import { logger } from '$lib/utils/logger';
import { parseError } from '$lib/utils/errorHandler';

export const GET: RequestHandler = async ({ url, locals, cookies }) => {
	try {
		if (!locals.user || locals.user.role !== 'admin') {
			return json({ success: false, error: 'Unauthorized' }, { status: 401 });
		}

		const searchParams = url.searchParams;
		const queryParams = new URLSearchParams();
		const search = searchParams.get('search') || searchParams.get('q') || '';
		const category = searchParams.get('category') || '';
		const isPublished = searchParams.get('isPublished');
		const page = searchParams.get('page') || '1';
		const limit = searchParams.get('limit') || '20';

		if (search) queryParams.set('search', search);
		if (category) queryParams.set('category', category);
		if (isPublished !== null && isPublished !== '') queryParams.set('isPublished', isPublished);
		if (page) queryParams.set('page', page);
		if (limit) queryParams.set('limit', limit);

		const endpoint = `/admin/blog-articles${queryParams.toString() ? `?${queryParams.toString()}` : ''}`;
		const response = await backendGet(endpoint, { cookies });
		const result = await parseBackendResponse<{ data: unknown[]; pagination: Record<string, unknown> }>(response);

		return json({
			success: true,
			data: result.data,
			pagination: result.pagination || {
				page: parseInt(page, 10),
				limit: parseInt(limit, 10),
				total: 0,
				totalPages: 0
			}
		});
	} catch (error) {
		logger.error('Admin blog articles list error:', error);
		const parsed = parseError(error);
		return json(
			{ success: false, error: parsed.userMessage || 'Failed to fetch articles' },
			{ status: parsed.status || 500 }
		);
	}
};

export const POST: RequestHandler = async ({ request, locals, cookies }) => {
	try {
		if (!locals.user || locals.user.role !== 'admin') {
			return json({ success: false, error: 'Unauthorized' }, { status: 401 });
		}

		const body = await request.json();
		const response = await backendPost('/admin/blog-articles', body, { cookies });
		const article = await parseBackendResponse<unknown>(response);

		return json({ success: true, data: article });
	} catch (error) {
		logger.error('Create blog article error:', error);
		const parsed = parseError(error);
		return json(
			{ success: false, error: parsed.userMessage || 'Failed to create article' },
			{ status: parsed.status || 500 }
		);
	}
};
