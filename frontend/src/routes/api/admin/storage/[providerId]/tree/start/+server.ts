import { json } from '@sveltejs/kit';
import type { RequestHandler } from './$types';
import { backendPost, parseBackendResponse } from '$lib/utils/backend-api';
import { logger } from '$lib/utils/logger';
import { isAdmin } from '$lib/server/admin-access';

/** POST /api/admin/storage/:providerId/tree/start */
export const POST: RequestHandler = async ({ params, url, locals, cookies }) => {
	try {
		if (!isAdmin(locals.user)) {
			return json({ message: 'Unauthorized' }, { status: 401 });
		}

		const q = new URL(url).search;
		const response = await backendPost(
			`/admin/storage/${encodeURIComponent(params.providerId)}/tree/start${q}`,
			{},
			{ cookies },
		);
		const parsed = await parseBackendResponse<{ jobId?: string }>(response);
		return json(parsed, { status: response.status });
	} catch (error) {
		logger.error('API admin/storage tree start:', error);
		return json({ message: 'Failed to start folder tree scan' }, { status: 500 });
	}
};
