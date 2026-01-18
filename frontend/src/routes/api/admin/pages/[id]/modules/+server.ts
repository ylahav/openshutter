import { json } from '@sveltejs/kit';
import type { RequestHandler } from './$types';
import { backendGet, backendPost, parseBackendResponse } from '$lib/utils/backend-api';

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
		console.error('Admin page modules GET error:', error);
		const errorMessage = error instanceof Error ? error.message : String(error);
		return json({ success: false, error: errorMessage || 'Failed to fetch modules' }, { status: 500 });
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
		console.error('Admin page modules POST error:', error);
		const errorMessage = error instanceof Error ? error.message : String(error);
		return json({ success: false, error: errorMessage || 'Failed to create module' }, { status: 500 });
	}
};
