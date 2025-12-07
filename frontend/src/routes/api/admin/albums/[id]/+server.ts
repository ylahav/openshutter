import { json } from '@sveltejs/kit';
import type { RequestHandler } from './$types';
import { backendPut, parseBackendResponse } from '$lib/utils/backend-api';

export const PUT: RequestHandler = async ({ params, request, locals, cookies }) => {
	try {
		// Require admin access
		if (!locals.user || locals.user.role !== 'admin') {
			return json({ success: false, error: 'Unauthorized' }, { status: 401 });
		}

		const { id } = await params;
		const body = await request.json();

		const response = await backendPut(`/admin/albums/${id}`, body, { cookies });
		const album = await parseBackendResponse<any>(response);

		return json({
			success: true,
			data: album
		});
	} catch (error) {
		console.error('Update album error:', error);
		const errorMessage = error instanceof Error ? error.message : String(error);
		return json({ success: false, error: errorMessage || 'Failed to update album' }, { status: 500 });
	}
};
