import { json } from '@sveltejs/kit';
import type { RequestHandler } from './$types';
import { backendPost, parseBackendResponse } from '$lib/utils/backend-api';

export const POST: RequestHandler = async ({ params, request, locals, cookies }) => {
	try {
		if (!locals.user) {
			return json({ success: false, error: 'Unauthorized' }, { status: 401 });
		}

		const { id } = await params;
		const body = await request.json();
		const endpoint = `/admin/albums/${id}/check-files`;
		const response = await backendPost(endpoint, body, { cookies });
		const result = await parseBackendResponse<any>(response);

		return json({
			success: true,
			data: result.data || result
		});
	} catch (error) {
		console.error('Check files error:', error);
		const errorMessage = error instanceof Error ? error.message : String(error);
		return json({ success: false, error: `Failed to check files: ${errorMessage}` }, { status: 500 });
	}
};
