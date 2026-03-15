import { json } from '@sveltejs/kit';
import type { RequestHandler } from './$types';
import { backendGet, parseBackendResponse } from '$lib/utils/backend-api';
import { parseError } from '$lib/utils/errorHandler';

export const GET: RequestHandler = async ({ locals, cookies }) => {
	try {
		// Check admin access
		if (!locals.user || locals.user.role !== 'admin') {
			return json({ success: false, error: 'Unauthorized' }, { status: 401 });
		}

		// Get all storage configs from backend
		const response = await backendGet('/admin/storage', { cookies });
		const configs = await parseBackendResponse<any[]>(response);

		// Ensure configs is an array
		if (!Array.isArray(configs)) {
			console.error('[storage] Backend did not return an array:', configs);
			return json([]);
		}

		return json(configs);
	} catch (error) {
		console.error('[storage] Failed to get storage configs:', error);
		const parsed = parseError(error);
		const status = parsed.status && (parsed.status === 502 || parsed.status === 503) ? parsed.status : 500;
		return json(
			{ success: false, error: parsed.userMessage || parsed.message || 'Failed to get storage configurations' },
			{ status }
		);
	}
};
