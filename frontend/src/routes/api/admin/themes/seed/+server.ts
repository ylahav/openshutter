import { json } from '@sveltejs/kit';
import type { RequestHandler } from './$types';
import { backendPost, parseBackendResponse } from '$lib/utils/backend-api';
import { logger } from '$lib/utils/logger';
import { parseError } from '$lib/utils/errorHandler';

export const POST: RequestHandler = async ({ locals, cookies }) => {
	try {
		if (!locals.user || locals.user.role !== 'admin') {
			return json({ success: false, error: 'Unauthorized' }, { status: 401 });
		}

		const response = await backendPost('/admin/themes/seed', {}, { cookies });
		const result = await parseBackendResponse<{ data?: unknown[]; count?: number }>(response);
		const raw = Array.isArray(result) ? result : result?.data ?? [];

		return json({
			success: true,
			count: Array.isArray(result) ? result.length : result?.count ?? raw.length,
			data: raw,
		});
	} catch (error) {
		logger.error('Seed themes API error:', error);
		const parsed = parseError(error);
		return json(
			{
				success: false,
				error: parsed.userMessage || parsed.message || 'Failed to seed themes',
			},
			{ status: parsed.status || 500 },
		);
	}
};
