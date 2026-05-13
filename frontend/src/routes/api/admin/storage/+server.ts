import { json } from '@sveltejs/kit';
import type { RequestHandler } from './$types';
import { backendGet } from '$lib/utils/backend-api';
import { logger } from '$lib/utils/logger';

/** GET /api/admin/storage → Nest GET /api/admin/storage */
export const GET: RequestHandler = async ({ locals, cookies }) => {
	try {
		if (!locals.user || locals.user.role !== 'admin') {
			return json({ message: 'Unauthorized' }, { status: 401 });
		}

		const response = await backendGet('/admin/storage', { cookies });
		const text = await response.text();
		let body: unknown = [];
		try {
			body = text ? JSON.parse(text) : [];
		} catch {
			body = { message: 'Invalid response from backend' };
			return json(body, { status: 502 });
		}

		return json(body, { status: response.status });
	} catch (error) {
		logger.error('API admin/storage GET:', error);
		return json({ message: 'Failed to load storage configuration' }, { status: 500 });
	}
};
