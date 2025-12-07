import { json } from '@sveltejs/kit';
import type { RequestHandler } from './$types';
import { backendGet, parseBackendResponse } from '$lib/utils/backend-api';

export const GET: RequestHandler = async ({ params, locals, cookies }) => {
	try {
		// Require admin access
		if (!locals.user || locals.user.role !== 'admin') {
			return json({ success: false, error: 'Admin access required' }, { status: 403 });
		}

		const { id } = await params;

		if (!id) {
			return json({ success: false, error: 'Album ID is required' }, { status: 400 });
		}

		const response = await backendGet(`/admin/albums/${id}/photos`, { cookies });
		const result = await parseBackendResponse<{ success?: boolean; data?: any[] }>(response);

		return json({
			success: result.success !== undefined ? result.success : true,
			data: result.data || result
		});
	} catch (error) {
		console.error('Admin Photos API error:', error);
		const errorMessage = error instanceof Error ? error.message : String(error);
		return json({ success: false, error: errorMessage || 'Failed to fetch photos' }, { status: 500 });
	}
};
