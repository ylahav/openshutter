import { json } from '@sveltejs/kit';
import type { RequestHandler } from './$types';
import { backendPost, parseBackendResponse } from '$lib/utils/backend-api';
import { logger } from '$lib/utils/logger';
import { parseError } from '$lib/utils/errorHandler';
import { requireAdminOrOwner } from '$lib/server/admin-access';

export const POST: RequestHandler = async ({ params, request, locals, cookies }) => {
	try {
		// Require admin or owner
		const denied = requireAdminOrOwner(locals);
		if (denied) return denied;

		const { id } = await params;
		if (!id) {
			return json({ success: false, error: 'Photo ID is required' }, { status: 400 });
		}

		const body = await request.json();
		const response = await backendPost(`/admin/photos/${id}/suggest-tags`, body, { cookies });
		const result = await parseBackendResponse<any>(response);

		if (result?.success === false) {
			return json({
				success: false,
				error: result.error || 'Failed to suggest tags',
			});
		}

		return json({
			success: result.success !== undefined ? result.success : true,
			data: result.data ?? result,
		});
	} catch (error) {
		logger.error('Suggest tags API error:', error);
		const parsed = parseError(error);
		return json(
			{
				success: false,
				error: parsed.userMessage || 'Failed to suggest tags',
			},
			{ status: parsed.status || 500 }
		);
	}
};
