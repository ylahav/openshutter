import { json } from '@sveltejs/kit';
import type { RequestHandler } from './$types';
import { backendPost, parseBackendResponse } from '$lib/utils/backend-api';
import { logger } from '$lib/utils/logger';
import { parseError } from '$lib/utils/errorHandler';

export const POST: RequestHandler = async ({ request, locals, cookies }) => {
	try {
		if (!locals.user || locals.user.role !== 'admin') {
			return json({ success: false, error: 'Unauthorized' }, { status: 401 });
		}

		const body = await request.json();
		const response = await backendPost('/admin/photos/bulk/re-extract-exif', body, { cookies });
		const result = await parseBackendResponse<any>(response);

		return json({
			success: true,
			...result,
			data: result.data ?? result
		});
	} catch (error) {
		logger.error('Bulk re-extract EXIF error:', error);
		const parsed = parseError(error);
		return json(
			{
				success: false,
				error: parsed.userMessage || 'Failed to re-extract EXIF for selected photos'
			},
			{ status: parsed.status || 500 }
		);
	}
};
