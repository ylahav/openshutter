import { json } from '@sveltejs/kit';
import type { RequestHandler } from './$types';
import { backendPost, parseBackendResponse } from '$lib/utils/backend-api';

export const POST: RequestHandler = async ({ params, locals, cookies }) => {
	try {
		// Check admin access
		if (!locals.user || locals.user.role !== 'admin') {
			return json({ success: false, error: 'Unauthorized' }, { status: 401 });
		}

		const { providerId } = params;
		if (!providerId) {
			return json({ success: false, error: 'Provider ID is required' }, { status: 400 });
		}

		// Test connection in backend
		const response = await backendPost(`/admin/storage/${providerId}/test`, {}, { cookies });
		const result = await parseBackendResponse(response);

		return json({ success: true, data: result });
	} catch (error) {
		console.error('[storage test] Connection test failed:', error);
		const errorMessage = error instanceof Error ? error.message : String(error);
		return json(
			{ success: false, error: errorMessage || 'Connection test failed' },
			{ status: 500 }
		);
	}
};
