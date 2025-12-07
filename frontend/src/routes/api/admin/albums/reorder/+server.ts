import { json } from '@sveltejs/kit';
import type { RequestHandler } from './$types';
import { backendPut, parseBackendResponse } from '$lib/utils/backend-api';

export const PUT: RequestHandler = async ({ request, locals, cookies }) => {
	try {
		// Require admin or owner access
		if (!locals.user || (locals.user.role !== 'admin' && locals.user.role !== 'owner')) {
			return json({ success: false, error: 'Forbidden' }, { status: 403 });
		}

		const body = await request.json();
		const updates = body?.updates || [];

		if (!Array.isArray(updates) || updates.length === 0) {
			return json({ success: false, error: 'No updates provided' }, { status: 400 });
		}

		// Note: Backend may not have this endpoint, so we might need to keep direct DB access
		// For now, try backend first, fallback to direct if needed
		try {
			const response = await backendPut('/admin/albums/reorder', { updates }, { cookies });
			const result = await parseBackendResponse<{ success?: boolean }>(response);
			return json({ success: result.success !== undefined ? result.success : true });
		} catch (backendError) {
			// If backend doesn't have this endpoint, we'll need to keep direct DB access
			// For now, return error - this can be implemented in backend later
			console.error('Backend reorder endpoint not available:', backendError);
			throw backendError;
		}
	} catch (error) {
		console.error('Failed to reorder albums:', error);
		const errorMessage = error instanceof Error ? error.message : String(error);
		return json({ success: false, error: errorMessage || 'Failed to reorder albums' }, { status: 500 });
	}
};
