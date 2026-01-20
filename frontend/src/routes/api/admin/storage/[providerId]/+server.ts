import { json } from '@sveltejs/kit';
import type { RequestHandler } from './$types';
import { backendGet, backendPut, parseBackendResponse } from '$lib/utils/backend-api';

export const GET: RequestHandler = async ({ params, locals, cookies }) => {
	try {
		// Check admin access
		if (!locals.user || locals.user.role !== 'admin') {
			return json({ success: false, error: 'Unauthorized' }, { status: 401 });
		}

		const { providerId } = params;
		if (!providerId) {
			return json({ success: false, error: 'Provider ID is required' }, { status: 400 });
		}

		// Get config from backend
		const response = await backendGet(`/admin/storage/${providerId}`, { cookies });
		const config = await parseBackendResponse(response);

		return json(config);
	} catch (error) {
		console.error('[storage config] Failed to get config:', error);
		const errorMessage = error instanceof Error ? error.message : String(error);
		return json(
			{ success: false, error: errorMessage || 'Failed to get storage configuration' },
			{ status: 500 }
		);
	}
};

export const PUT: RequestHandler = async ({ params, request, locals, cookies }) => {
	try {
		// Check admin access
		if (!locals.user || locals.user.role !== 'admin') {
			return json({ success: false, error: 'Unauthorized' }, { status: 401 });
		}

		const { providerId } = params;
		if (!providerId) {
			return json({ success: false, error: 'Provider ID is required' }, { status: 400 });
		}

		const body = await request.json();

		// Update config in backend
		const response = await backendPut(`/admin/storage/${providerId}`, body, { cookies });
		const result = await parseBackendResponse(response);

		return json({ success: true, data: result });
	} catch (error) {
		console.error('[storage config] Failed to update config:', error);
		const errorMessage = error instanceof Error ? error.message : String(error);
		return json(
			{ success: false, error: errorMessage || 'Failed to update storage configuration' },
			{ status: 500 }
		);
	}
};
