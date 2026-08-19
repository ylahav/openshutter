import { json } from '@sveltejs/kit';
import type { RequestHandler } from './$types';
import { backendPost, parseBackendResponse } from '$lib/utils/backend-api';
import { logger } from '$lib/utils/logger';
import { parseError } from '$lib/utils/errorHandler';
import { requireAdmin } from '$lib/server/admin-access';

export const POST: RequestHandler = async ({ params, request, locals, cookies }) => {
	try {
		const denied = requireAdmin(locals);
		if (denied) return denied;

		const { id } = await params;
		const body = await request.json().catch(() => ({}));

		const response = await backendPost(`/admin/pages/${id}/duplicate`, body, { cookies });
		const result = await parseBackendResponse<any>(response);

		return json({
			success: true,
			data: result
		});
	} catch (error) {
		logger.error('Duplicate page error:', error);
		const parsed = parseError(error);
		return json(
			{
				success: false,
				error: parsed.userMessage || 'Failed to duplicate page'
			},
			{ status: parsed.status || 500 }
		);
	}
};
