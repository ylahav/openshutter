import { json } from '@sveltejs/kit';
import type { RequestHandler } from './$types';
import { backendGet, parseBackendResponse } from '$lib/utils/backend-api';
import { logger } from '$lib/utils/logger';
import { parseError } from '$lib/utils/errorHandler';

export const GET: RequestHandler = async ({ locals, cookies, url }) => {
	try {
		if (!locals.user || locals.user.role !== 'owner') {
			return json(
				{ success: false, error: 'Owner access only', code: 'OWNER_ONLY' },
				{ status: 403 },
			);
		}

		const qs = url.searchParams.toString();
		const path = qs ? `/owner/analytics/search-tag-filters?${qs}` : '/owner/analytics/search-tag-filters';
		const response = await backendGet(path, { cookies });
		const body = await parseBackendResponse<{ data: unknown }>(response);

		return json({
			success: true,
			data: body.data ?? body,
		});
	} catch (error) {
		logger.error('Failed to get owner search-tag-filters analytics:', error);
		const parsed = parseError(error);
		return json(
			{
				success: false,
				error: parsed.userMessage || 'Failed to load analytics',
			},
			{ status: parsed.status || 500 },
		);
	}
};
