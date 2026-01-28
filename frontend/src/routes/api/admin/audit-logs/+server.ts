import { json } from '@sveltejs/kit';
import type { RequestHandler } from './$types';
import { backendGet, parseBackendResponse } from '$lib/utils/backend-api';
import { logger } from '$lib/utils/logger';
import { parseError } from '$lib/utils/errorHandler';

export const GET: RequestHandler = async ({ url, locals, cookies }) => {
	try {
		// Require admin access
		if (!locals.user || locals.user.role !== 'admin') {
			return json({ success: false, error: 'Forbidden' }, { status: 403 });
		}

		const searchParams = url.searchParams;
		
		// Build query string - pass all parameters to backend
		const queryParams = new URLSearchParams();
		for (const [key, value] of searchParams.entries()) {
			queryParams.set(key, value);
		}

		const endpoint = `/admin/audit-logs${queryParams.toString() ? `?${queryParams.toString()}` : ''}`;
		const response = await backendGet(endpoint, { cookies });
		const result = await parseBackendResponse<{ data: any[] }>(response);

		return json({
			success: true,
			data: result.data || result
		});
	} catch (error) {
		logger.error('API: Error fetching audit logs:', error);
		const parsed = parseError(error);
		return json(
			{ success: false, error: parsed.userMessage || `Failed to fetch audit logs: ${parsed.message}` },
			{ status: parsed.status || 500 }
		);
	}
};
