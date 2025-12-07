import { json } from '@sveltejs/kit';
import type { RequestHandler } from './$types';
import { backendPost, parseBackendResponse } from '$lib/utils/backend-api';

export const POST: RequestHandler = async ({ params, request, locals, cookies }) => {
	try {
		if (!locals.user || (locals.user.role !== 'admin' && locals.user.role !== 'owner')) {
			return json({ success: false, error: 'Insufficient permissions' }, { status: 403 });
		}

		const { id } = await params;
		const body = await request.json();
		const endpoint = `/admin/albums/${id}/re-read-exif`;
		const response = await backendPost(endpoint, body, { cookies });
		const result = await parseBackendResponse<any>(response);

		return json({
			success: true,
			message: result.message || 'EXIF data re-read completed',
			data: result.data || result
		});
	} catch (error) {
		console.error('Failed to re-read EXIF data:', error);
		const errorMessage = error instanceof Error ? error.message : 'Unknown error';
		return json(
			{
				success: false,
				error: 'Failed to re-read EXIF data',
				details: errorMessage
			},
			{ status: 500 }
		);
	}
};
