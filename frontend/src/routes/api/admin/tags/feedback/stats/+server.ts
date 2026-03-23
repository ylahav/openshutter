import { json } from '@sveltejs/kit';
import type { RequestHandler } from './$types';
import { backendGet, parseBackendResponse } from '$lib/utils/backend-api';
import { logger } from '$lib/utils/logger';
import { parseError } from '$lib/utils/errorHandler';

export const GET: RequestHandler = async ({ locals, cookies }) => {
	try {
		if (!locals.user || locals.user.role !== 'admin') {
			return json({ success: false, error: 'Unauthorized' }, { status: 401 });
		}

		const response = await backendGet('/admin/tags/feedback/stats', { cookies });
		const result = await parseBackendResponse<any>(response);

		return json({
			success: true,
			data: result.data || result || {},
		});
	} catch (error) {
		logger.error('Tag feedback stats API error:', error);
		const parsed = parseError(error);
		return json(
			{
				success: false,
				error: parsed.userMessage || 'Failed to load tag feedback stats',
			},
			{ status: parsed.status || 500 },
		);
	}
};
