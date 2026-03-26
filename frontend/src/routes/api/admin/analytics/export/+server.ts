import { json } from '@sveltejs/kit';
import type { RequestHandler } from './$types';
import { backendRequest } from '$lib/utils/backend-api';
import { logger } from '$lib/utils/logger';
import { parseError } from '$lib/utils/errorHandler';

export const GET: RequestHandler = async ({ locals, cookies, url }) => {
	try {
		// Require admin access
		if (!locals.user || locals.user.role !== 'admin') {
			return json({ success: false, error: 'Unauthorized' }, { status: 401 });
		}

		const search = url.searchParams.toString();
		const query = search ? `?${search}` : '';

		// Export endpoint returns CSV/JSON depending on query params.
		const response = await backendRequest(`/admin/analytics/export${query}`, {
			method: 'GET',
			cookies
		});

		const body = await response.arrayBuffer();
		const headers = new Headers(response.headers);

		return new Response(body, {
			status: response.status,
			headers
		});
	} catch (error) {
		logger.error('Failed to export analytics:', error);
		const parsed = parseError(error);
		return json(
			{
				success: false,
				error: parsed.userMessage || 'Failed to export analytics'
			},
			{ status: parsed.status || 500 }
		);
	}
};

