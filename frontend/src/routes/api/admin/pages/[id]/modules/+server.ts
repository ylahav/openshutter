import { json } from '@sveltejs/kit';
import type { RequestHandler } from './$types';
import { backendGet, backendPost, parseBackendResponse } from '$lib/utils/backend-api';
import { logger } from '$lib/utils/logger';
import { parseError } from '$lib/utils/errorHandler';

export const GET: RequestHandler = async ({ params, locals, cookies }) => {
	try {
		if (!locals.user || locals.user.role !== 'admin') {
			return json({ success: false, error: 'Unauthorized' }, { status: 401 });
		}

		const { id } = params;
		const response = await backendGet(`/admin/pages/${id}/modules`, { cookies });
		const result = await parseBackendResponse<{ data: any[] }>(response);

		return json({
			success: true,
			data: result.data || result
		});
	} catch (error) {
		logger.error('Admin page modules GET error:', error);
		const parsed = parseError(error);
		return json({ 
			success: false, 
			error: parsed.userMessage || 'Failed to fetch modules' 
		}, { status: parsed.status || 500 });
	}
};

export const POST: RequestHandler = async ({ params, request, locals, cookies }) => {
	try {
		if (!locals.user || locals.user.role !== 'admin') {
			return json({ success: false, error: 'Unauthorized' }, { status: 401 });
		}

		const { id } = params;
		const body = await request.json();
		const response = await backendPost(`/admin/pages/${id}/modules`, body, { cookies });
		const moduleData = await parseBackendResponse<any>(response);

		return json({
			success: true,
			data: moduleData
		});
	} catch (error) {
		logger.error('Admin page modules POST error:', error);
		const parsed = parseError(error);
		return json({ 
			success: false, 
			error: parsed.userMessage || 'Failed to create module' 
		}, { status: parsed.status || 500 });
	}
};
