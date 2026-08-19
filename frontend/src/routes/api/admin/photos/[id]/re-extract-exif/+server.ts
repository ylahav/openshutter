import { json } from '@sveltejs/kit';
import type { RequestHandler } from './$types';
import { backendPost, parseBackendResponse } from '$lib/utils/backend-api';
import { logger } from '$lib/utils/logger';
import { parseError } from '$lib/utils/errorHandler';
import { requireAdminOrOwner } from '$lib/server/admin-access';

export const POST: RequestHandler = async ({ params, locals, cookies }) => {
	try {
		const denied = requireAdminOrOwner(locals);
		if (denied) return denied;

		const { id } = await params;

		const response = await backendPost(`/admin/photos/${id}/re-extract-exif`, undefined, { cookies });
		const result = await parseBackendResponse<any>(response);

		return json({
			success: true,
			data: result.data || result,
			message: result.message || 'EXIF data re-extracted successfully'
		});
	} catch (error) {
		logger.error('Re-extract EXIF error:', error);
		const parsed = parseError(error);
		return json(
			{
				success: false,
				error: parsed.userMessage || 'Failed to re-extract EXIF'
			},
			{ status: parsed.status || 500 }
		);
	}
};
