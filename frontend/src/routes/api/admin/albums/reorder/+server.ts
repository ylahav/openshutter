import { json } from '@sveltejs/kit';
import type { RequestHandler } from './$types';
import { backendPut, parseBackendResponse } from '$lib/utils/backend-api';
import { logger } from '$lib/utils/logger';
import { parseError } from '$lib/utils/errorHandler';
import { requireAdminOrOwner } from '$lib/server/admin-access';

export const PUT: RequestHandler = async ({ request, locals, cookies }) => {
	try {
		// Require admin or owner (backend enforces album ownership for owners)
		const denied = requireAdminOrOwner(locals);
		if (denied) return denied;

		const body = await request.json();
		const response = await backendPut('/admin/albums/reorder', body, { cookies });
		const result = await parseBackendResponse<any>(response);

		return json({
			success: true,
			data: result
		});
	} catch (error) {
		logger.error('Reorder albums error:', error);
		const parsed = parseError(error);
		return json({ 
			success: false, 
			error: parsed.userMessage || 'Failed to reorder albums' 
		}, { status: parsed.status || 500 });
	}
};
