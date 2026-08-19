import { json } from '@sveltejs/kit';
import type { RequestHandler } from './$types';
import { backendGet, parseBackendResponse } from '$lib/utils/backend-api';
import { logger } from '$lib/utils/logger';
import { parseError } from '$lib/utils/errorHandler';
import { requireAdminOrOwner } from '$lib/server/admin-access';

export const GET: RequestHandler = async ({ params, url, locals, cookies }) => {
	try {
		const denied = requireAdminOrOwner(locals);
		if (denied) return denied;

		const { id } = await params;
		if (!id) {
			return json({ success: false, error: 'Photo ID is required' }, { status: 400 });
		}

		const limit = url.searchParams.get('limit');
		const tagIds = url.searchParams.get('tagIds');
		const query = new URLSearchParams();
		if (limit) query.set('limit', limit);
		if (tagIds) query.set('tagIds', tagIds);

		const response = await backendGet(`/admin/photos/${id}/related-tags?${query.toString()}`, { cookies });
		const result = await parseBackendResponse<any>(response);

		return json({
			success: result.success !== undefined ? result.success : true,
			data: result.data || [],
			total: result.total || result.data?.length || 0,
		});
	} catch (error) {
		logger.error('Related tags for photo API error:', error);
		const parsed = parseError(error);
		return json(
			{
				success: false,
				error: parsed.userMessage || 'Failed to load related tags',
			},
			{ status: parsed.status || 500 }
		);
	}
};
