import { json } from '@sveltejs/kit';
import type { RequestHandler } from './$types';
import { backendGet, parseBackendResponse } from '$lib/utils/backend-api';
import { logger } from '$lib/utils/logger';
import { parseError } from '$lib/utils/errorHandler';
import { requireAdminOrOwner } from '$lib/server/admin-access';

export const GET: RequestHandler = async ({ locals, cookies, url }) => {
	try {
		// Require admin access
		const denied = requireAdminOrOwner(locals);
		if (denied) return denied;

		const search = url.searchParams.toString();
		const query = search ? `?${search}` : '';

		const response = await backendGet(`/admin/analytics/search${query}`, { cookies });
		const result = await parseBackendResponse<any>(response);

		return json({
			success: true,
			data: result.data || result
		});
	} catch (error) {
		logger.error('Failed to get search analytics:', error);
		const parsed = parseError(error);
		return json(
			{
				success: false,
				error: parsed.userMessage || 'Failed to get search analytics'
			},
			{ status: parsed.status || 500 }
		);
	}
};

