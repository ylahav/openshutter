import { json } from '@sveltejs/kit';
import type { RequestHandler } from './$types';
import { backendDelete, backendGet, backendPut, parseBackendResponse } from '$lib/utils/backend-api';
import { logger } from '$lib/utils/logger';
import { parseError } from '$lib/utils/errorHandler';

export const GET: RequestHandler = async ({ params, locals, cookies }) => {
	try {
		if (!locals.user || locals.user.role !== 'admin') {
			return json({ success: false, error: 'Unauthorized' }, { status: 401 });
		}

		const { id } = await params;
		const response = await backendGet(`/admin/blog-articles/${id}`, { cookies });
		const article = await parseBackendResponse<unknown>(response);

		return json({ success: true, data: article });
	} catch (error) {
		logger.error('Get blog article error:', error);
		const parsed = parseError(error);
		return json(
			{ success: false, error: parsed.userMessage || 'Failed to fetch article' },
			{ status: parsed.status || 500 }
		);
	}
};

export const PUT: RequestHandler = async ({ params, request, locals, cookies }) => {
	try {
		if (!locals.user || locals.user.role !== 'admin') {
			return json({ success: false, error: 'Unauthorized' }, { status: 401 });
		}

		const { id } = await params;
		const body = await request.json();
		const response = await backendPut(`/admin/blog-articles/${id}`, body, { cookies });
		const article = await parseBackendResponse<unknown>(response);

		return json({ success: true, data: article });
	} catch (error) {
		logger.error('Update blog article error:', error);
		const parsed = parseError(error);
		return json(
			{ success: false, error: parsed.userMessage || 'Failed to update article' },
			{ status: parsed.status || 500 }
		);
	}
};

export const DELETE: RequestHandler = async ({ params, locals, cookies }) => {
	try {
		if (!locals.user || locals.user.role !== 'admin') {
			return json({ success: false, error: 'Unauthorized' }, { status: 401 });
		}

		const { id } = await params;
		const response = await backendDelete(`/admin/blog-articles/${id}`, { cookies });
		const result = await parseBackendResponse<{ success?: boolean; message?: string }>(response);

		return json({
			success: result.success !== undefined ? result.success : true,
			message: result.message || 'Article deleted'
		});
	} catch (error) {
		logger.error('Delete blog article error:', error);
		const parsed = parseError(error);
		return json(
			{ success: false, error: parsed.userMessage || 'Failed to delete article' },
			{ status: parsed.status || 500 }
		);
	}
};
