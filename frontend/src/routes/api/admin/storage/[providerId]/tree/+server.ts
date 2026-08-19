import { json } from '@sveltejs/kit';
import type { RequestHandler } from './$types';
import { backendGet } from '$lib/utils/backend-api';
import { logger } from '$lib/utils/logger';
import { isAdmin } from '$lib/server/admin-access';

/** GET /api/admin/storage/:providerId/tree → Nest GET /api/admin/storage/:providerId/tree */
export const GET: RequestHandler = async ({ params, url, locals, cookies }) => {
	try {
		if (!isAdmin(locals.user)) {
			return json({ message: 'Unauthorized' }, { status: 401 });
		}

		const q = new URL(url).search;
		const response = await backendGet(
			`/admin/storage/${encodeURIComponent(params.providerId)}/tree${q}`,
			{ cookies },
		);
		const text = await response.text();
		let parsed: Record<string, unknown> = {};
		try {
			parsed = text ? (JSON.parse(text) as Record<string, unknown>) : {};
		} catch {
			parsed = { message: text?.trim() || 'Invalid response from backend' };
		}

		return json(parsed, { status: response.status });
	} catch (error) {
		logger.error('API admin/storage tree:', error);
		return json({ message: 'Failed to load folder tree' }, { status: 500 });
	}
};
