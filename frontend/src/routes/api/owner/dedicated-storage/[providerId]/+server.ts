import { json } from '@sveltejs/kit';
import type { RequestHandler } from './$types';
import { backendRequest, parseBackendResponse } from '$lib/utils/backend-api';
import { logger } from '$lib/utils/logger';
import { parseError } from '$lib/utils/errorHandler';

/** PUT /api/owner/dedicated-storage/:providerId */
export const PUT: RequestHandler = async ({ params, request, locals, cookies }) => {
	try {
		if (!locals.user || locals.user.role !== 'owner') {
			return json({ success: false, error: 'Unauthorized' }, { status: 401 });
		}
		const body = await request.json();
		const endpoint = `/owner/dedicated-storage/${encodeURIComponent(params.providerId)}`;
		const response = await backendRequest(endpoint, {
			method: 'PUT',
			cookies,
			body: JSON.stringify(body),
		});
		const data = await parseBackendResponse<any>(response);
		return json(data);
	} catch (error) {
		logger.error('Failed to save dedicated storage:', error);
		const parsed = parseError(error);
		return json(
			{ success: false, error: parsed.userMessage || 'Failed to save dedicated storage' },
			{ status: parsed.status || 500 },
		);
	}
};
