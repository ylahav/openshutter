import { json } from '@sveltejs/kit';
import type { RequestHandler } from './$types';
import { backendPost, parseBackendResponse } from '$lib/utils/backend-api';
import { logger } from '$lib/utils/logger';
import { parseError } from '$lib/utils/errorHandler';

export const POST: RequestHandler = async ({ params, request, locals, cookies }) => {
	try {
		if (!locals.user || locals.user.role !== 'admin') {
			return json({ success: false, error: 'Unauthorized' }, { status: 401 });
		}

		const { id } = await params;
		const body = await request.json().catch(() => ({}));
		const response = await backendPost(`/admin/themes/${id}/duplicate`, body, { cookies });
		const theme = await parseBackendResponse<any>(response);

		return json({
			success: true,
			data: theme,
			message: 'Theme duplicated successfully'
		});
	} catch (error) {
		logger.error('Duplicate theme error:', error);
		const parsed = parseError(error);
		return json({
			success: false,
			error: parsed.userMessage || 'Failed to duplicate theme'
		}, { status: parsed.status || 500 });
	}
};
