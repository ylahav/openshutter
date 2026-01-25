import { json } from '@sveltejs/kit';
import type { RequestHandler } from './$types';
import { backendPost, parseBackendResponse } from '$lib/utils/backend-api';

export const POST: RequestHandler = async ({ request, cookies }) => {
	try {
		const body = await request.json();
		const response = await backendPost('/admin/photos/bulk-update', body, { cookies });
		const result = await parseBackendResponse<any>(response);

		return json({
			success: true,
			data: result.data || result
		});
	} catch (error) {
		console.error('Error bulk updating photos:', error);
		const errorMessage = error instanceof Error ? error.message : String(error);
		return json(
			{ success: false, error: `Failed to bulk update photos: ${errorMessage}` },
			{ status: 500 }
		);
	}
};
