import { json } from '@sveltejs/kit';
import type { RequestHandler } from './$types';
import { backendGet, parseBackendResponse } from '$lib/utils/backend-api';
import { logger } from '$lib/utils/logger';
import { parseError } from '$lib/utils/errorHandler';
import { requireAdminOrOwner } from '$lib/server/admin-access';

export const GET: RequestHandler = async ({ params, url, locals, cookies }) => {
	try {
		// Require admin or owner (backend enforces album ownership for owners)
		const denied = requireAdminOrOwner(locals);
		if (denied) return denied;

		const { id } = await params;

		if (!id) {
			return json({ success: false, error: 'Album ID is required' }, { status: 400 });
		}

		const includeSubAlbums = url.searchParams.get('includeSubAlbums');
		const query = includeSubAlbums ? `?includeSubAlbums=${encodeURIComponent(includeSubAlbums)}` : '';
		const response = await backendGet(`/admin/albums/${id}/photos${query}`, { cookies });
		const result = await parseBackendResponse<{ success?: boolean; data?: any[]; fromSubAlbums?: boolean }>(response);

		return json({
			success: result.success !== undefined ? result.success : true,
			data: result.data || result,
			fromSubAlbums: result.fromSubAlbums,
		});
	} catch (error) {
		logger.error('Admin Photos API error:', error);
		const parsed = parseError(error);
		return json({ 
			success: false, 
			error: parsed.userMessage || 'Failed to fetch photos' 
		}, { status: parsed.status || 500 });
	}
};
