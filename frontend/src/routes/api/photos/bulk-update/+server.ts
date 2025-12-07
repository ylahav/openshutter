import { json } from '@sveltejs/kit';
import type { RequestHandler } from './$types';
import { backendPost, parseBackendResponse } from '$lib/utils/backend-api';

export const POST: RequestHandler = async ({ request, locals, cookies }) => {
	try {
		if (!locals.user) {
			return json({ success: false, error: 'Unauthorized' }, { status: 401 });
		}

		const body = await request.json();
		const response = await backendPost('/photos/bulk-update', body, { cookies });
		const result = await parseBackendResponse<any>(response);

		return json({
			success: true,
			message: result.message || 'Photos updated successfully',
			data: result.data || result
		});
	} catch (error) {
		console.error('Bulk update error:', error);
		const errorMessage = error instanceof Error ? error.message : 'Unknown error';
		return json(
			{
				success: false,
				error: `Failed to update photos: ${errorMessage}`
			},
			{ status: 500 }
		);
	}
};
