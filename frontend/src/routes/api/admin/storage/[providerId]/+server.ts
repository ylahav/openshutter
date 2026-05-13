import { json } from '@sveltejs/kit';
import type { RequestHandler } from './$types';
import { backendPut } from '$lib/utils/backend-api';
import { logger } from '$lib/utils/logger';

/** PUT /api/admin/storage/:providerId → Nest PUT /api/admin/storage/:providerId */
export const PUT: RequestHandler = async ({ params, request, locals, cookies }) => {
	try {
		if (!locals.user || locals.user.role !== 'admin') {
			return json({ message: 'Unauthorized' }, { status: 401 });
		}

		const body = await request.json().catch(() => ({}));
		const response = await backendPut(
			`/admin/storage/${encodeURIComponent(params.providerId)}`,
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
		logger.error('API admin/storage PUT:', error);
		return json({ message: 'Failed to save storage configuration' }, { status: 500 });
	}
};
