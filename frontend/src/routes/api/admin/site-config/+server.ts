import { json } from '@sveltejs/kit';
import type { RequestHandler } from './$types';
import { backendGet, backendPut, parseBackendResponse } from '$lib/utils/backend-api';

export const GET: RequestHandler = async ({ locals, cookies }) => {
	try {
		// Require admin access
		if (!locals.user || locals.user.role !== 'admin') {
			return json({ success: false, error: 'Unauthorized' }, { status: 401 });
		}

		const response = await backendGet('/admin/site-config', { cookies });
		const config = await parseBackendResponse<any>(response);

		return json({
			success: true,
			data: config
		});
	} catch (error) {
		console.error('API: Failed to get site config:', error);
		const errorMessage = error instanceof Error ? error.message : String(error);
		return json({ success: false, error: errorMessage || 'Failed to get site configuration' }, { status: 500 });
	}
};

export const PUT: RequestHandler = async ({ request, locals, cookies }) => {
	try {
		// Require admin access
		if (!locals.user || locals.user.role !== 'admin') {
			return json({ success: false, error: 'Unauthorized' }, { status: 401 });
		}

		const updates = await request.json();

		const response = await backendPut('/admin/site-config', updates, { cookies });
		const config = await parseBackendResponse<any>(response);

		return json({
			success: true,
			data: config
		});
	} catch (error) {
		console.error('Failed to update site config:', error);
		const errorMessage = error instanceof Error ? error.message : String(error);
		return json(
			{ success: false, error: errorMessage || 'Failed to update site configuration' },
			{ status: 500 }
		);
	}
};
