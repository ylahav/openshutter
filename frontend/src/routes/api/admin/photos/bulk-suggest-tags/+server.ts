import { json } from '@sveltejs/kit';
import type { RequestHandler } from './$types';
import { backendPost, parseBackendResponse } from '$lib/utils/backend-api';
import { logger } from '$lib/utils/logger';
import { parseError } from '$lib/utils/errorHandler';

export const POST: RequestHandler = async ({ request, locals, cookies }) => {
	try {
		// Require admin or owner
		if (!locals.user || (locals.user.role !== 'admin' && locals.user.role !== 'owner')) {
			return json({ success: false, error: 'Unauthorized' }, { status: 401 });
		}

		const body = await request.json();
		if (!body.photoIds || !Array.isArray(body.photoIds) || body.photoIds.length === 0) {
			return json({ success: false, error: 'photoIds array is required' }, { status: 400 });
		}

		const response = await backendPost('/admin/photos/bulk-suggest-tags', body, { cookies });
		const result = await parseBackendResponse<any>(response);

		return json({
			success: result.success !== undefined ? result.success : true,
			data: result.data || result,
		});
	} catch (error) {
		logger.error('Bulk suggest tags API error:', error);
		const parsed = parseError(error);
		return json(
			{
				success: false,
				error: parsed.userMessage || 'Failed to start bulk suggest tags',
			},
			{ status: parsed.status || 500 }
		);
	}
};
