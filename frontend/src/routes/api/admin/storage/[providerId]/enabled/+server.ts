import { json } from '@sveltejs/kit';
import type { RequestHandler } from './$types';
import { backendPatch } from '$lib/utils/backend-api';
import { logger } from '$lib/utils/logger';

/** PATCH /api/admin/storage/:providerId/enabled → Nest PATCH /api/admin/storage/:providerId/enabled */
export const PATCH: RequestHandler = async ({ params, request, locals, cookies }) => {
	try {
		if (!locals.user || locals.user.role !== 'admin') {
			return json({ message: 'Unauthorized' }, { status: 401 });
		}

		const body = await request.json().catch(() => ({}));
		const response = await backendPatch(
			`/admin/storage/${encodeURIComponent(params.providerId)}/enabled`,
			body,
			{ cookies },
		);
		const text = await response.text();
		let parsed: unknown = {};
		try {
			parsed = text ? JSON.parse(text) : {};
		} catch {
			parsed = { message: 'Invalid response from backend' };
		}

		return json(parsed, { status: response.status });
	} catch (error) {
		logger.error('API admin/storage enabled PATCH:', error);
		return json({ message: 'Failed to update provider enabled state' }, { status: 500 });
	}
};
