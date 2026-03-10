import { json } from '@sveltejs/kit';
import type { RequestHandler } from './$types';
import { backendGet, parseBackendResponse } from '$lib/utils/backend-api';
import { logger } from '$lib/utils/logger';
import { parseError } from '$lib/utils/errorHandler';

export const GET: RequestHandler = async ({ url, locals, cookies }) => {
	try {
		if (!locals.user || locals.user.role !== 'admin') {
			return json({ success: false, error: 'Unauthorized' }, { status: 401 });
		}

		const tagId = url.searchParams.get('tagId');
		const limit = url.searchParams.get('limit') || '8';

		if (!tagId) {
			return json({ success: false, error: 'tagId query parameter is required' }, { status: 400 });
		}

		const query = new URLSearchParams({ tagId, limit });
		const response = await backendGet(`/admin/tags/related/by-id?${query.toString()}`, { cookies });
		const result = await parseBackendResponse<{ data: any[]; total: number }>(response);

		return json({
			success: true,
			data: result.data || [],
			total: result.total || 0,
		});
	} catch (error) {
		logger.error('Related tags API error:', error);
		const parsed = parseError(error);
		return json(
			{
				success: false,
				error: parsed.userMessage || 'Failed to fetch related tags',
			},
			{ status: parsed.status || 500 },
		);
	}
};
