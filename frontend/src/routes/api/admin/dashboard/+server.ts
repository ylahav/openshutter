import { json } from '@sveltejs/kit';
import type { RequestHandler } from './$types';
import { backendGet, parseBackendResponse } from '$lib/utils/backend-api';
import { logger } from '$lib/utils/logger';
import { parseError } from '$lib/utils/errorHandler';
import { requireAdminOrOwner } from '$lib/server/admin-access';

export const GET: RequestHandler = async ({ locals, cookies }) => {
	try {
		const denied = requireAdminOrOwner(locals);
		if (denied) return denied;

		const response = await backendGet('/admin/dashboard', { cookies });
		const data = await parseBackendResponse<unknown>(response);
		return json(data);
	} catch (error) {
		logger.error('Admin dashboard API error:', error);
		const parsed = parseError(error);
		return json(
			{
				success: false,
				error: parsed.userMessage || 'Failed to load dashboard',
			},
			{ status: parsed.status || 500 },
		);
	}
};
