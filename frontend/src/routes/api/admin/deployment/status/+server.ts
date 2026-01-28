import { json } from '@sveltejs/kit';
import type { RequestHandler } from './$types';
import { backendGet, parseBackendResponse } from '$lib/utils/backend-api';
import { logger } from '$lib/utils/logger';
import { parseError } from '$lib/utils/errorHandler';

export const GET: RequestHandler = async ({ locals, cookies }) => {
	try {
		// Require admin access
		if (!locals.user || locals.user.role !== 'admin') {
			return json({ success: false, error: 'Forbidden' }, { status: 403 });
		}

		const response = await backendGet('/admin/deployment/status', { cookies });
		const status = await parseBackendResponse<any>(response);

		return json({
			success: true,
			data: status
		});
	} catch (error) {
		logger.error('Error getting deployment status:', error);
		const parsed = parseError(error);
		return json(
			{ success: false, error: parsed.userMessage || 'Failed to get deployment status' },
			{ status: parsed.status || 500 }
		);
	}
};
