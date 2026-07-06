import { json } from '@sveltejs/kit';
import type { RequestHandler } from './$types';
import { backendGet, parseBackendResponse } from '$lib/utils/backend-api';
import { logger } from '$lib/utils/logger';
import { parseError } from '$lib/utils/errorHandler';

/** GET /api/videos/[id]/admin → backend GET /videos/[id]/admin (returns unpublished too, for the edit form). */
export const GET: RequestHandler = async ({ params, cookies }) => {
	try {
		const { id } = params;
		if (!id) return json({ success: false, error: 'Video ID is required' }, { status: 400 });
		const response = await backendGet(`/videos/${id}/admin`, { cookies });
		const video = await parseBackendResponse<unknown>(response);
		return json(video);
	} catch (error) {
		logger.error('Failed to get video (admin):', error);
		const parsed = parseError(error);
		return json(
			{ success: false, error: parsed.userMessage || parsed.message },
			{ status: parsed.status || 500 }
		);
	}
};
