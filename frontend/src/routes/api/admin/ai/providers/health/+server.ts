import { json } from '@sveltejs/kit';
import type { RequestHandler } from './$types';
import { backendGet, parseBackendResponse } from '$lib/utils/backend-api';
import { logger } from '$lib/utils/logger';
import { parseError } from '$lib/utils/errorHandler';
import { requireAdmin } from '$lib/server/admin-access';

export const GET: RequestHandler = async ({ locals, cookies }) => {
	try {
		const denied = requireAdmin(locals);
		if (denied) return denied;

		const response = await backendGet('/admin/ai/providers/health', { cookies });
		const result = await parseBackendResponse<any>(response);
		return json({
			success: true,
			data: result.data || result,
		});
	} catch (error) {
		logger.error('Failed to fetch AI providers health:', error);
		const parsed = parseError(error);
		return json(
			{
				success: false,
				error: parsed.userMessage || 'Failed to fetch AI providers health',
			},
			{ status: parsed.status || 500 },
		);
	}
};

