import { json } from '@sveltejs/kit';
import type { RequestHandler } from './$types';
import { backendGet, backendPut, backendDelete, parseBackendResponse } from '$lib/utils/backend-api';
import { logger } from '$lib/utils/logger';
import { parseError } from '$lib/utils/errorHandler';

export const GET: RequestHandler = async ({ params, locals, cookies }) => {
	try {
		if (!locals.user || locals.user.role !== 'admin') {
			return json({ success: false, error: 'Unauthorized' }, { status: 401 });
		}

		const { id } = await params;
		const response = await backendGet(`/admin/themes/${id}`, { cookies });
		const theme = await parseBackendResponse<any>(response);

		return json({
			success: true,
			data: theme
		});
	} catch (error) {
		logger.error('Get theme error:', error);
		const parsed = parseError(error);
		return json({
			success: false,
			error: parsed.userMessage || 'Failed to fetch theme'
		}, { status: parsed.status || 500 });
	}
};

export const PUT: RequestHandler = async ({ params, request, locals, cookies }) => {
	try {
		if (!locals.user || locals.user.role !== 'admin') {
			return json({ success: false, error: 'Unauthorized' }, { status: 401 });
		}

		const { id } = await params;
		const body = await request.json();

		const response = await backendPut(`/admin/themes/${id}`, body, { cookies });
		const theme = await parseBackendResponse<any>(response);

		return json({
			success: true,
			data: theme,
			message: 'Theme updated successfully'
		});
	} catch (error) {
		logger.error('Update theme error:', error);
		const parsed = parseError(error);
		return json({
			success: false,
			error: parsed.userMessage || 'Failed to update theme'
		}, { status: parsed.status || 500 });
	}
};

export const DELETE: RequestHandler = async ({ params, locals, cookies }) => {
	try {
		if (!locals.user || locals.user.role !== 'admin') {
			return json({ success: false, error: 'Unauthorized' }, { status: 401 });
		}

		const { id } = await params;
		const response = await backendDelete(`/admin/themes/${id}`, { cookies });
		await parseBackendResponse<{ success?: boolean }>(response);

		return json({
			success: true,
			message: 'Theme deleted successfully'
		});
	} catch (error) {
		logger.error('Delete theme error:', error);
		const parsed = parseError(error);
		return json({
			success: false,
			error: parsed.userMessage || 'Failed to delete theme'
		}, { status: parsed.status || 500 });
	}
};
