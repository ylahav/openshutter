import { json } from '@sveltejs/kit';
import type { RequestHandler } from './$types';
import { backendGet, backendPut, backendDelete, parseBackendResponse } from '$lib/utils/backend-api';
import { logger } from '$lib/utils/logger';
import { parseError } from '$lib/utils/errorHandler';

export const GET: RequestHandler = async ({ params, locals, cookies }) => {
	try {
		// Require admin access
		if (!locals.user || locals.user.role !== 'admin') {
			return json({ success: false, error: 'Unauthorized' }, { status: 401 });
		}

		const { id } = await params;

		const response = await backendGet(`/admin/locations/${id}`, { cookies });
		const location = await parseBackendResponse<any>(response);

		return json({
			success: true,
			data: location
		});
	} catch (error) {
		logger.error('Get location error:', error);
		const parsed = parseError(error);
		return json({ 
			success: false, 
			error: parsed.userMessage || 'Failed to fetch location' 
		}, { status: parsed.status || 500 });
	}
};

export const PUT: RequestHandler = async ({ params, request, locals, cookies }) => {
	try {
		// Require admin access
		if (!locals.user || locals.user.role !== 'admin') {
			return json({ success: false, error: 'Unauthorized' }, { status: 401 });
		}

		const { id } = await params;
		const body = await request.json();

		const response = await backendPut(`/admin/locations/${id}`, body, { cookies });
		const location = await parseBackendResponse<any>(response);

		return json({
			success: true,
			data: location
		});
	} catch (error) {
		logger.error('Update location error:', error);
		const parsed = parseError(error);
		return json({ 
			success: false, 
			error: parsed.userMessage || 'Failed to update location' 
		}, { status: parsed.status || 500 });
	}
};

export const DELETE: RequestHandler = async ({ params, locals, cookies }) => {
	try {
		// Require admin access
		if (!locals.user || locals.user.role !== 'admin') {
			return json({ success: false, error: 'Unauthorized' }, { status: 401 });
		}

		const { id } = await params;

		const response = await backendDelete(`/admin/locations/${id}`, { cookies });
		const result = await parseBackendResponse<{ success: boolean; message: string }>(response);

		return json({
			success: result.success !== undefined ? result.success : true,
			message: result.message || 'Location deleted successfully'
		});
	} catch (error) {
		logger.error('Delete location error:', error);
		const parsed = parseError(error);
		return json({ 
			success: false, 
			error: parsed.userMessage || 'Failed to delete location' 
		}, { status: parsed.status || 500 });
	}
};
