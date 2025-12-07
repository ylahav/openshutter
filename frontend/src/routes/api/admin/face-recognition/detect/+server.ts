import { json } from '@sveltejs/kit';
import type { RequestHandler } from './$types';
import { backendPost, parseBackendResponse } from '$lib/utils/backend-api';

/**
 * POST /api/admin/face-recognition/detect
 * Detect faces in a photo
 */
export const POST: RequestHandler = async ({ request, locals, cookies }) => {
	try {
		if (locals.user?.role !== 'admin' && locals.user?.role !== 'owner') {
			return json({ success: false, error: 'Forbidden' }, { status: 403 });
		}

		const body = await request.json();
		const response = await backendPost('/admin/face-recognition/detect', body, { cookies });
		const result = await parseBackendResponse<any>(response);

		return json({
			success: true,
			data: result.data || result
		});
	} catch (error) {
		console.error('Face detection error:', error);
		const errorMessage = error instanceof Error ? error.message : 'Face detection failed';
		return json({ success: false, error: errorMessage }, { status: 500 });
	}
};
