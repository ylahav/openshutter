import { json } from '@sveltejs/kit';
import type { RequestHandler } from './$types';
import { backendGet, backendPut, parseBackendResponse } from '$lib/utils/backend-api';
import { logger } from '$lib/utils/logger';
import { parseError } from '$lib/utils/errorHandler';

/**
 * GET /api/albums/:id - Fetch a single album by ID (with access control).
 * Used by owner edit and album detail. Forwards cookies so backend can apply group/user access.
 */
export const GET: RequestHandler = async ({ params, cookies }) => {
	try {
		const { id } = await params;
		if (!id) {
			return json({ success: false, error: 'Album ID is required' }, { status: 400 });
		}
		const response = await backendGet(`/albums/${id}`, { cookies });
		if (!response.ok) {
			const errorData = await response.json().catch(() => ({ message: 'Album not found' }));
			return json(
				{ success: false, error: errorData.message || errorData.error || 'Album not found' },
				{ status: response.status }
			);
		}
		const album = await parseBackendResponse<any>(response);
		return json({ success: true, data: album });
	} catch (error) {
		logger.error('GET /api/albums/[id] error:', error);
		const parsed = parseError(error);
		return json(
			{ success: false, error: parsed.userMessage || 'Failed to fetch album' },
			{ status: parsed.status || 500 }
		);
	}
};

/**
 * PUT /api/albums/:id - Update an album (owner: own albums only; admin: any album).
 * Requires authentication as admin or owner. Forwards cookies for auth.
 */
export const PUT: RequestHandler = async ({ params, request, cookies }) => {
	try {
		const { id } = await params;
		if (!id) {
			return json({ success: false, error: 'Album ID is required' }, { status: 400 });
		}
		const body = await request.json();
		const response = await backendPut(`/albums/${id}`, body, { cookies });
		if (!response.ok) {
			const errorData = await response.json().catch(() => ({ message: 'Update failed' }));
			return json(
				{
					success: false,
					error: errorData.message || errorData.error || 'Failed to update album',
				},
				{ status: response.status }
			);
		}
		const album = await parseBackendResponse<any>(response);
		return json({ success: true, data: album });
	} catch (error) {
		logger.error('PUT /api/albums/[id] error:', error);
		const parsed = parseError(error);
		return json(
			{ success: false, error: parsed.userMessage || 'Failed to update album' },
			{ status: parsed.status || 500 }
		);
	}
};
