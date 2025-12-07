import { json } from '@sveltejs/kit';
import type { RequestHandler } from './$types';
import { backendGet, parseBackendResponse } from '$lib/utils/backend-api';

export const GET: RequestHandler = async ({ params, cookies }) => {
	try {
		const { id } = await params;
		const endpoint = `/albums/${id}/cover-image`;
		const response = await backendGet(endpoint, { cookies });
		const result = await parseBackendResponse<any>(response);

		return json({
			success: true,
			data: result.data || result
		});
	} catch (error) {
		console.error('Error getting album cover image:', error);
		const errorMessage = error instanceof Error ? error.message : String(error);
		return json(
			{ success: false, error: `Failed to get album cover image: ${errorMessage}` },
			{ status: 500 }
		);
	}
};
