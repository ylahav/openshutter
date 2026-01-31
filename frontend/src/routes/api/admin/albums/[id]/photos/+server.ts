import { json } from '@sveltejs/kit';
import type { RequestHandler } from './$types';
import { backendGet, parseBackendResponse } from '$lib/utils/backend-api';
import { logger } from '$lib/utils/logger';
import { parseError } from '$lib/utils/errorHandler';

export const GET: RequestHandler = async ({ params, locals, cookies }) => {
	try {
		// Require admin or owner (backend enforces album ownership for owners)
		if (!locals.user || (locals.user.role !== 'admin' && locals.user.role !== 'owner')) {
			return json({ success: false, error: 'Unauthorized' }, { status: 401 });
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
		logger.error('Admin Photos API error:', error);
		const parsed = parseError(error);
		return json({ 
			success: false, 
			error: parsed.userMessage || 'Failed to fetch photos' 
		}, { status: parsed.status || 500 });
	}
};
