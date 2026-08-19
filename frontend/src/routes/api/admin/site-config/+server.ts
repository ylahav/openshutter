import { json } from '@sveltejs/kit';
import type { RequestHandler } from './$types';
import { backendGet, backendPut, parseBackendResponse, AuthenticationError } from '$lib/utils/backend-api';
import { logger } from '$lib/utils/logger';
import { parseError } from '$lib/utils/errorHandler';
import { requireAdmin } from '$lib/server/admin-access';

export const GET: RequestHandler = async ({ locals, cookies }) => {
	try {
		// Require admin access
		const denied = requireAdmin(locals);
		if (denied) return denied;

		const response = await backendGet('/admin/site-config', { cookies });
		const config = await parseBackendResponse<any>(response);

		return json({
			success: true,
			data: config
		});
	} catch (error) {
		logger.error('API: Failed to get site config:', error);
		if (error instanceof AuthenticationError) {
			return json({ success: false, error: error.message }, { status: error.statusCode ?? 401 });
		}
		const parsed = parseError(error);
		return json(
			{ success: false, error: parsed.userMessage || 'Failed to get site configuration' },
			{ status: parsed.status ?? 500 }
		);
	}
};

export const PUT: RequestHandler = async ({ request, locals, cookies }) => {
	try {
		// Require admin access
		const denied = requireAdmin(locals);
		if (denied) return denied;

		const updates = await request.json();

		const response = await backendPut('/admin/site-config', updates, { cookies });
		const config = await parseBackendResponse<any>(response);

		return json({
			success: true,
			data: config
		});
	} catch (error) {
		logger.error('Failed to update site config:', error);
		if (error instanceof AuthenticationError) {
			return json({ success: false, error: error.message }, { status: error.statusCode ?? 401 });
		}
		const parsed = parseError(error);
		return json(
			{ success: false, error: parsed.userMessage || 'Failed to update site configuration' },
			{ status: parsed.status ?? 500 }
		);
	}
};
