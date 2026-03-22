import { json } from '@sveltejs/kit';
import type { RequestHandler } from './$types';
import { backendGet, parseBackendResponse } from '$lib/utils/backend-api';
import { logger } from '$lib/utils/logger';
import { parseError } from '$lib/utils/errorHandler';

/** GET /api/owner/dedicated-storage -> backend GET /owner/dedicated-storage */
export const GET: RequestHandler = async ({ locals, cookies }) => {
	try {
		if (!locals.user || locals.user.role !== 'owner') {
			return json({ success: false, error: 'Unauthorized' }, { status: 401 });
		}
		const response = await backendGet('/owner/dedicated-storage', { cookies });
		const data = await parseBackendResponse<any>(response);
		return json(data);
	} catch (error) {
		logger.error('Failed to load dedicated storage:', error);
		const parsed = parseError(error);
		return json(
			{ success: false, error: parsed.userMessage || 'Failed to load dedicated storage' },
			{ status: parsed.status || 500 },
		);
	}
};
