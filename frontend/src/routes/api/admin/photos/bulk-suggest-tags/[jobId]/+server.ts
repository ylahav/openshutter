import { json } from '@sveltejs/kit';
import type { RequestHandler } from './$types';
import { backendGet, parseBackendResponse } from '$lib/utils/backend-api';
import { logger } from '$lib/utils/logger';
import { parseError } from '$lib/utils/errorHandler';

export const GET: RequestHandler = async ({ params, locals, cookies }) => {
	try {
		// Require admin or owner
		if (!locals.user || (locals.user.role !== 'admin' && locals.user.role !== 'owner')) {
			return json({ success: false, error: 'Unauthorized' }, { status: 401 });
		}

		const { jobId } = await params;
		if (!jobId) {
			return json({ success: false, error: 'Job ID is required' }, { status: 400 });
		}

		const response = await backendGet(`/admin/photos/bulk-suggest-tags/${jobId}`, { cookies });
		const result = await parseBackendResponse<any>(response);

		return json({
			success: result.success !== undefined ? result.success : true,
			data: result.data || result,
		});
	} catch (error) {
		logger.error('Get bulk suggest tags status API error:', error);
		const parsed = parseError(error);
		return json(
			{
				success: false,
				error: parsed.userMessage || 'Failed to get bulk suggest tags status',
			},
			{ status: parsed.status || 500 }
		);
	}
};
