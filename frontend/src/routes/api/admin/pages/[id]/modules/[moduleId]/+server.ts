import { json } from '@sveltejs/kit';
import type { RequestHandler } from './$types';
import { backendPut, backendDelete, parseBackendResponse } from '$lib/utils/backend-api';
import { logger } from '$lib/utils/logger';
import { parseError } from '$lib/utils/errorHandler';

export const PUT: RequestHandler = async ({ params, request, locals, cookies }) => {
	try {
		if (!locals.user || locals.user.role !== 'admin') {
			return json({ success: false, error: 'Unauthorized' }, { status: 401 });
		}

		const { id, moduleId } = params;
		const body = await request.json();
		const response = await backendPut(`/admin/pages/${id}/modules/${moduleId}`, body, { cookies });
		const moduleData = await parseBackendResponse<any>(response);

		return json({
			success: true,
			data: moduleData
		});
	} catch (error) {
		logger.error('Admin page modules PUT error:', error);
		const parsed = parseError(error);
		return json({ 
			success: false, 
			error: parsed.userMessage || 'Failed to update module' 
		}, { status: parsed.status || 500 });
	}
};

export const DELETE: RequestHandler = async ({ params, locals, cookies }) => {
	try {
		if (!locals.user || locals.user.role !== 'admin') {
			return json({ success: false, error: 'Unauthorized' }, { status: 401 });
		}

		const { id, moduleId } = params;
		const response = await backendDelete(`/admin/pages/${id}/modules/${moduleId}`, { cookies });
		const result = await parseBackendResponse<{ success?: boolean; message?: string }>(response);

		return json({
			success: result.success !== undefined ? result.success : true,
			message: result.message || 'Module deleted successfully'
		});
	} catch (error) {
		logger.error('Admin page modules DELETE error:', error);
		const parsed = parseError(error);
		return json({ 
			success: false, 
			error: parsed.userMessage || 'Failed to delete module' 
		}, { status: parsed.status || 500 });
	}
};
