import { json } from '@sveltejs/kit';
import type { RequestHandler } from './$types';
import { backendGet, backendPut, backendDelete, backendPost, parseBackendResponse } from '$lib/utils/backend-api';
import { logger } from '$lib/utils/logger';
import { parseError } from '$lib/utils/errorHandler';

export const GET: RequestHandler = async ({ params, locals, cookies }) => {
	try {
		// Require admin access
		if (!locals.user || locals.user.role !== 'admin') {
			return json({ success: false, error: 'Unauthorized' }, { status: 401 });
		}

		const { id } = await params;

		const response = await backendGet(`/admin/photos/${id}`, { cookies });
		const photo = await parseBackendResponse<any>(response);

		return json({
			success: true,
			data: photo
		});
	} catch (error) {
		logger.error('Get photo error:', error);
		const parsed = parseError(error);
		return json({ 
			success: false, 
			error: parsed.userMessage || 'Failed to fetch photo' 
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

		const response = await backendPut(`/admin/photos/${id}`, body, { cookies });
		const photo = await parseBackendResponse<any>(response);

		return json({
			success: true,
			data: photo
		});
	} catch (error) {
		logger.error('Update photo error:', error);
		const parsed = parseError(error);
		return json({ 
			success: false, 
			error: parsed.userMessage || 'Failed to update photo' 
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

		const response = await backendDelete(`/admin/photos/${id}`, { cookies });
		
		// Handle error responses
		if (!response.ok) {
			const errorText = await response.text().catch(() => 'Unknown error');
			let errorData: any = {};
			try {
				errorData = JSON.parse(errorText);
			} catch {
				errorData = { error: errorText || `HTTP ${response.status}: ${response.statusText}` };
			}
			return json({ 
				success: false, 
				error: errorData.error || errorData.message || `Failed to delete photo (${response.status})` 
			}, { status: response.status });
		}

		// Parse successful response
		let result: any = {};
		try {
			result = await parseBackendResponse<{ success?: boolean; message?: string }>(response);
		} catch (parseError) {
			logger.warn('Failed to parse DELETE response:', parseError);
			// If parsing fails but status is OK, assume success
			return json({ success: true, message: 'Photo deleted successfully' });
		}

		// Handle response - result could be the full object or just data
		if (result && typeof result === 'object') {
			// If result has success property, use it; otherwise assume success
			const success = result.success !== undefined ? result.success : true;
			const message = result.message || 'Photo deleted successfully';
			return json({ success, message });
		}

		// Default success response if result is empty or unexpected format
		return json({ success: true, message: 'Photo deleted successfully' });
	} catch (error) {
		logger.error('Delete photo error:', error);
		const parsed = parseError(error);
		return json({ 
			success: false, 
			error: parsed.userMessage || 'Failed to delete photo' 
		}, { status: parsed.status || 500 });
	}
};
