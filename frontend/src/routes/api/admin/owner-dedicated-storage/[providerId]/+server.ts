import { json } from '@sveltejs/kit';
import type { RequestHandler } from './$types';
import { backendRequest, parseBackendResponse } from '$lib/utils/backend-api';
import { logger } from '$lib/utils/logger';
import { parseError } from '$lib/utils/errorHandler';

/** PUT /api/admin/owner-dedicated-storage/:providerId?ownerId= */
export const PUT: RequestHandler = async ({ params, url, request, cookies }) => {
	try {
		const ownerId = url.searchParams.get('ownerId');
		if (!ownerId) {
			return json({ error: 'ownerId query parameter is required' }, { status: 400 });
		}
		const body = await request.json();
		const endpoint = `/admin/owner-dedicated-storage/${encodeURIComponent(params.providerId)}?ownerId=${encodeURIComponent(ownerId)}`;
		const response = await backendRequest(endpoint, {
			method: 'PUT',
			cookies,
			body: JSON.stringify(body),
		});
		const data = await parseBackendResponse<any>(response);
		return json(data);
	} catch (error) {
		logger.error('Failed to save owner dedicated storage:', error);
		const parsed = parseError(error);
		return json(
			{ error: parsed.userMessage || 'Failed to save owner dedicated storage' },
			{ status: parsed.status || 500 },
		);
	}
};
