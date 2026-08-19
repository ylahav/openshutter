import { json } from '@sveltejs/kit';
import type { RequestHandler } from './$types';
import { backendPost, parseBackendResponse } from '$lib/utils/backend-api';
import { logger } from '$lib/utils/logger';
import { parseError } from '$lib/utils/errorHandler';
import { requireAdminOrOwner } from '$lib/server/admin-access';

export const POST: RequestHandler = async ({ request, locals, cookies }) => {
	try {
		const denied = requireAdminOrOwner(locals);
		if (denied) return denied;

		const body = await request.json();
		const response = await backendPost('/admin/locations/geocode', body, { cookies });
		const result = await parseBackendResponse<Record<string, unknown>>(response);

		return json({
			success: true,
			data: result
		});
	} catch (error) {
		logger.error('Admin location geocode error:', error);
		const parsed = parseError(error);
		return json(
			{
				success: false,
				error: parsed.userMessage || 'Geocoding failed'
			},
			{ status: parsed.status || 500 }
		);
	}
};
