import { json } from '@sveltejs/kit';
import type { RequestHandler } from './$types';
import { backendPost, parseBackendResponse } from '$lib/utils/backend-api';

export const POST: RequestHandler = async ({ request, cookies }) => {
	try {
		const body = await request.json();
		const response = await backendPost('/albums/cover-images', body, { cookies });
		const result = await parseBackendResponse<any>(response);

		return json({
			success: true,
			data: result.data || result
		});
	} catch (error) {
		console.error('Error getting album cover images:', error);
		const errorMessage = error instanceof Error ? error.message : String(error);
		return json(
			{ success: false, error: `Failed to get album cover images: ${errorMessage}` },
			{ status: 500 }
		);
	}
};
