import { json } from '@sveltejs/kit';
import type { RequestHandler } from './$types';
import { backendGet, parseBackendResponse } from '$lib/utils/backend-api';

export const GET: RequestHandler = async ({ locals, cookies }) => {
	try {
		// Require admin access
		if (!locals.user || locals.user.role !== 'admin') {
			return json({ success: false, error: 'Unauthorized' }, { status: 401 });
		}

		const response = await backendGet('/admin/analytics', { cookies });
		const analyticsData = await parseBackendResponse<any>(response);

		return json({
			success: true,
			data: analyticsData
		});
	} catch (error) {
		console.error('Failed to get analytics:', error);
		const errorMessage = error instanceof Error ? error.message : String(error);
		return json({ success: false, error: errorMessage || 'Failed to get analytics' }, { status: 500 });
	}
};
