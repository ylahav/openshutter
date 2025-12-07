import { json } from '@sveltejs/kit';
import type { RequestHandler } from './$types';
import { backendGet, backendPut, parseBackendResponse } from '$lib/utils/backend-api';

export const GET: RequestHandler = async ({ locals, cookies }) => {
	try {
		// Require admin access
		if (!locals.user || locals.user.role !== 'admin') {
			return json({ success: false, error: 'Unauthorized' }, { status: 401 });
		}

		const response = await backendGet('/admin/templates', { cookies });
		const templates = await parseBackendResponse<any>(response);

		return json({ success: true, data: templates });
	} catch (error) {
		console.error('API: Error getting templates:', error);
		const errorMessage = error instanceof Error ? error.message : String(error);
		return json({ success: false, error: errorMessage || 'Failed to get templates' }, { status: 500 });
	}
};

export const PUT: RequestHandler = async ({ request, locals, cookies }) => {
	try {
		// Require admin access
		if (!locals.user || locals.user.role !== 'admin') {
			return json({ success: false, error: 'Unauthorized' }, { status: 401 });
		}

		const body = await request.json();
		const { templateName } = body;

		if (!templateName || typeof templateName !== 'string') {
			return json({ success: false, error: 'templateName is required' }, { status: 400 });
		}

		// Update via site-config endpoint (backend handles this)
		const response = await backendPut('/admin/templates', { templateName }, { cookies });
		const result = await parseBackendResponse<{ success?: boolean; message?: string }>(response);

		return json({
			success: result.success !== undefined ? result.success : true,
			message: result.message || 'Template updated successfully'
		});
	} catch (error) {
		console.error('API: Error setting template:', error);
		const errorMessage = error instanceof Error ? error.message : String(error);
		return json({ success: false, error: errorMessage || 'Failed to set template' }, { status: 500 });
	}
};
