import { json } from '@sveltejs/kit';
import type { RequestHandler } from './$types';
import { backendPost, parseBackendResponse } from '$lib/utils/backend-api';
import { logger } from '$lib/utils/logger';
import { parseError } from '$lib/utils/errorHandler';
import { requireAdminOrOwner } from '$lib/server/admin-access';

export const POST: RequestHandler = async ({ params, request, locals, cookies }) => {
	try {
		const denied = requireAdminOrOwner(locals);
		if (denied) return denied;

		const { id } = await params;
		const body = await request.json();

		const response = await backendPost(`/admin/photos/${id}/rotate`, body, { cookies });
		const result = await parseBackendResponse<any>(response);

		return json({
			success: true,
			data: result.data || result,
			message: result.message || 'Photo rotated'
		});
	} catch (error) {
		logger.error('Rotate photo error:', error);
		const parsed = parseError(error);
		return json(
			{ success: false, error: parsed.userMessage || 'Failed to rotate photo' },
			{ status: parsed.status || 500 }
		);
	}
};
