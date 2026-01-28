import { json } from '@sveltejs/kit';
import type { RequestHandler } from './$types';
import { backendPost, parseBackendResponse } from '$lib/utils/backend-api';
import { logger } from '$lib/utils/logger';
import { parseError } from '$lib/utils/errorHandler';

/**
 * POST /api/admin/face-recognition/person-descriptor
 * Extract and store face descriptor for a person from their profile image
 */
export const POST: RequestHandler = async ({ request, locals, cookies }) => {
	try {
		if (locals.user?.role !== 'admin' && locals.user?.role !== 'owner') {
			return json({ success: false, error: 'Forbidden' }, { status: 403 });
		}

		const body = await request.json();
		const response = await backendPost('/admin/face-recognition/person-descriptor', body, { cookies });
		const result = await parseBackendResponse<any>(response);

		return json({
			success: true,
			data: result.data || result
		});
	} catch (error) {
		logger.error('Person descriptor extraction error:', error);
		const parsed = parseError(error);
		return json({ 
			success: false, 
			error: parsed.userMessage || 'Descriptor extraction failed' 
		}, { status: parsed.status || 500 });
	}
};
