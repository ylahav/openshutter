import { json } from '@sveltejs/kit';
import type { RequestHandler } from './$types';
import { backendGet, parseBackendResponse } from '$lib/utils/backend-api';
import { logger } from '$lib/utils/logger';
import { parseError } from '$lib/utils/errorHandler';

/**
 * GET /api/albums/:id/photos - Fetch photos for an album (with access control).
 * Used by owner album detail and others. Forwards cookies so backend can apply access.
 */
export const GET: RequestHandler = async ({ params, url, cookies }) => {
	try {
		const { id } = await params;
		if (!id) {
			return json({ success: false, error: 'Album ID is required' }, { status: 400 });
		}
		const page = url.searchParams.get('page') || '1';
		const limit = url.searchParams.get('limit') || '50';
		const query = new URLSearchParams({ page, limit });
		const response = await backendGet(`/albums/${id}/photos?${query}`, { cookies });
		if (!response.ok) {
			const errorData = await response.json().catch(() => ({ message: 'Failed to load photos' }));
			return json(
				{ success: false, error: errorData.message || errorData.error || 'Failed to load photos' },
				{ status: response.status }
			);
		}
		const data = await parseBackendResponse<{ photos: any[]; pagination?: any }>(response);
		const photos = Array.isArray(data?.photos) ? data.photos : [];
		const pagination = data?.pagination;
		return json({ success: true, data: photos, pagination });
	} catch (error) {
		logger.error('GET /api/albums/[id]/photos error:', error);
		const parsed = parseError(error);
		return json(
			{ success: false, error: parsed.userMessage || 'Failed to load photos' },
			{ status: parsed.status || 500 }
		);
	}
};
