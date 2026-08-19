import { json } from '@sveltejs/kit';
import type { RequestHandler } from './$types';
import { backendPost } from '$lib/utils/backend-api';
import { logger } from '$lib/utils/logger';
import { requireAdmin } from '$lib/server/admin-access';

/** POST /api/admin/storage/:providerId/test → Nest POST /api/admin/storage/:providerId/test */
export const POST: RequestHandler = async ({ params, locals, cookies }) => {
	try {
		const denied = requireAdmin(locals);
		if (denied) return denied;

		const response = await backendPost(
			`/admin/storage/${encodeURIComponent(params.providerId)}/test`,
			undefined,
			{ cookies },
		);
		const text = await response.text();
		let parsed: unknown = {};
		try {
			parsed = text ? JSON.parse(text) : {};
		} catch {
			parsed = { success: false, error: 'Invalid response from backend' };
		}

		return json(parsed, { status: response.status });
	} catch (error) {
		logger.error('API admin/storage test:', error);
		return json({ success: false, error: 'Connection test failed' }, { status: 500 });
	}
};
