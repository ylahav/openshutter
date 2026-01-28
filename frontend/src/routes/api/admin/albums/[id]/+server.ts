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
		const response = await backendGet(`/admin/albums/${id}`, { cookies });
		const album = await parseBackendResponse(response);

		return json({
			success: true,
			data: album
		});
	} catch (error) {
		logger.error('Get album error:', error);
		const parsed = parseError(error);
		return json({ 
			success: false, 
			error: parsed.userMessage || 'Failed to fetch album' 
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

		const response = await backendPut(`/admin/albums/${id}`, body, { cookies });
		const album = await parseBackendResponse<any>(response);

		return json({
			success: true,
			data: album
		});
	} catch (error) {
		logger.error('Update album error:', error);
		const parsed = parseError(error);
		return json({ 
			success: false, 
			error: parsed.userMessage || 'Failed to update album' 
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
		logger.debug('[DELETE /api/admin/albums/[id]] Deleting album:', id);
		
		const response = await backendDelete(`/admin/albums/${id}`, { cookies });
		
		// DELETE requests may return empty body or success message
		if (response.ok) {
			try {
				const result = await parseBackendResponse(response);
				return json({
					success: true,
					data: result,
					message: 'Album deleted successfully'
				});
			} catch (parseError) {
				// Empty response is fine for DELETE
				return json({
					success: true,
					message: 'Album deleted successfully'
				});
			}
		} else {
			const errorText = await response.text().catch(() => 'Failed to delete album');
			let errorData: any = {};
			try {
				errorData = JSON.parse(errorText);
			} catch (parseError) {
				// Not JSON, use text as error message
			}
			
			const errorMessage = errorData.error || errorData.message || errorText || 'Failed to delete album';
			logger.error('[DELETE /api/admin/albums/[id]] Delete failed:', response.status, errorMessage);
			return json({ success: false, error: errorMessage }, { status: response.status });
		}
	} catch (error) {
		logger.error('Delete album error:', error);
		const parsed = parseError(error);
		return json({ 
			success: false, 
			error: parsed.userMessage || 'Failed to delete album' 
		}, { status: parsed.status || 500 });
	}
};
