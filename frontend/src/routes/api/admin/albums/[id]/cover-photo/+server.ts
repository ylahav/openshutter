import { json } from '@sveltejs/kit';
import type { RequestHandler } from './$types';
import { backendPut, parseBackendResponse } from '$lib/utils/backend-api';

export const PUT: RequestHandler = async ({ params, request, locals, cookies }) => {
	try {
		if (!locals.user || locals.user.role !== 'admin') {
			return json({ success: false, error: 'Unauthorized' }, { status: 401 });
		}

		const { id } = await params;
		const body = await request.json();
		const endpoint = `/admin/albums/${id}/cover-photo`;
		const response = await backendPut(endpoint, body, { cookies });
		const result = await parseBackendResponse<any>(response);

		return json({
			success: true,
			message: result.message || 'Cover photo updated successfully',
			data: result.data || result
		});
	} catch (error) {
		console.error('Error updating album cover photo:', error);
		const errorMessage = error instanceof Error ? error.message : String(error);
		return json(
			{ success: false, error: `Failed to update cover photo: ${errorMessage}` },
			{ status: 500 }
		);
	}
};
