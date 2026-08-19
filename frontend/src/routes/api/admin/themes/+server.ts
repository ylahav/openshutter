import { json } from '@sveltejs/kit';
import type { RequestHandler } from './$types';
import { backendGet, backendPost, parseBackendResponse } from '$lib/utils/backend-api';
import { logger } from '$lib/utils/logger';
import { parseError } from '$lib/utils/errorHandler';
import { requireAdmin } from '$lib/server/admin-access';

export const GET: RequestHandler = async ({ locals, cookies }) => {
	try {
		const denied = requireAdmin(locals);
		if (denied) return denied;

		const response = await backendGet('/admin/themes', { cookies });
		const themes = await parseBackendResponse<any>(response);

		return json({
			success: true,
			data: Array.isArray(themes) ? themes : themes?.data ?? []
		});
	} catch (error) {
		logger.error('Themes API error:', error);
		const parsed = parseError(error);
		const status = parsed.status || 500;
		const message = parsed.userMessage || parsed.message || 'Failed to fetch themes';
		return json({ success: false, error: message }, { status });
	}
};

export const POST: RequestHandler = async ({ request, locals, cookies }) => {
	try {
		const denied = requireAdmin(locals);
		if (denied) return denied;

		const body = await request.json();
		const response = await backendPost('/admin/themes', body, { cookies });
		const theme = await parseBackendResponse<any>(response);

		return json({
			success: true,
			data: theme
		});
	} catch (error) {
		logger.error('Create theme error:', error);
		const parsed = parseError(error);
		return json({
			success: false,
			error: parsed.userMessage || 'Failed to create theme'
		}, { status: parsed.status || 500 });
	}
};
