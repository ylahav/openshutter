import { json } from '@sveltejs/kit';
import type { RequestHandler } from './$types';
import { backendPost, parseBackendResponse } from '$lib/utils/backend-api';

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
		console.error('Person descriptor extraction error:', error);
		const errorMessage = error instanceof Error ? error.message : 'Descriptor extraction failed';
		return json({ success: false, error: errorMessage }, { status: 500 });
	}
};
