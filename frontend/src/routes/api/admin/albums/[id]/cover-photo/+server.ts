import { json } from '@sveltejs/kit';
import type { RequestHandler } from './$types';
import { backendPut, parseBackendResponse } from '$lib/utils/backend-api';
import { logger } from '$lib/utils/logger';
import { parseError } from '$lib/utils/errorHandler';

export const PUT: RequestHandler = async ({ params, request, locals, cookies }) => {
	try {
		if (!locals.user || (locals.user.role !== 'admin' && locals.user.role !== 'owner')) {
			return json({ success: false, error: 'Unauthorized' }, { status: 401 });
		}

		const { id } = await params;
		const body = await request.json();
		const endpoint = `/admin/albums/${id}/cover-photo`;
		const response = await backendPut(endpoint, body, { cookies });
		const result = await parseBackendResponse<any>(response);

		return json({
			success: true,
			message: result.message || 'Cover photo updated successfully',
			data: result.data || result
		});
	} catch (error) {
		logger.error('Error updating album cover photo:', error);
		const parsed = parseError(error);
		return json(
			{ success: false, error: parsed.userMessage || `Failed to update cover photo: ${parsed.message}` },
			{ status: parsed.status || 500 }
		);
	}
};
