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
		const endpoint = `/admin/albums/${id}/check-files`;
		const response = await backendPost(endpoint, body, { cookies });
		const result = await parseBackendResponse<any>(response);

		return json({
			success: true,
			data: result.data || result
		});
	} catch (error) {
		logger.error('Check files error:', error);
		const parsed = parseError(error);
		return json({ 
			success: false, 
			error: parsed.userMessage || `Failed to check files: ${parsed.message}` 
		}, { status: parsed.status || 500 });
	}
};
