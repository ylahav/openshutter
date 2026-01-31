import { json } from '@sveltejs/kit';
import type { RequestHandler } from './$types';
import { backendGet, parseBackendResponse } from '$lib/utils/backend-api';
import { logger } from '$lib/utils/logger';
import { parseError } from '$lib/utils/errorHandler';

export const GET: RequestHandler = async ({ locals, cookies }) => {
	try {
		// Check owner/admin access
		if (!locals.user || (locals.user.role !== 'owner' && locals.user.role !== 'admin')) {
			return json({ success: false, error: 'Unauthorized' }, { status: 401 });
		}

		// Use auth/storage-options so owner gets only their allowedStorageProviders; admin gets all enabled
		const response = await backendGet('/auth/storage-options', { cookies });
		// parseBackendResponse unwraps { success, data } and returns data (the array)
		const data = await parseBackendResponse<any[]>(response);

		if (Array.isArray(data)) {
			return json({ success: true, data });
		}

		return json({ success: false, error: 'Failed to load storage options' }, { status: 500 });
	} catch (error) {
		logger.error('Failed to get storage options:', error);
		const parsed = parseError(error);
		return json(
			{ success: false, error: parsed.userMessage || 'Failed to get storage options' },
			{ status: parsed.status || 500 }
		);
	}
};
