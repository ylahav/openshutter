import { json } from '@sveltejs/kit';
import type { RequestHandler } from './$types';
import { backendGet, parseBackendResponse } from '$lib/utils/backend-api';
import { logger } from '$lib/utils/logger';

/** GET /api/admin/storage/:providerId/tree/status/:jobId */
export const GET: RequestHandler = async ({ params, locals, cookies }) => {
	try {
		if (!locals.user || locals.user.role !== 'admin') {
			return json({ message: 'Unauthorized' }, { status: 401 });
		}

		const { providerId, jobId } = params;
		const response = await backendGet(
			`/admin/storage/${encodeURIComponent(providerId)}/tree/status/${encodeURIComponent(jobId)}`,
			{ cookies },
		);
		const parsed = await parseBackendResponse<Record<string, unknown>>(response);
		return json(parsed, { status: response.status });
	} catch (error) {
		logger.error('API admin/storage tree status:', error);
		return json({ message: 'Failed to get folder tree scan status' }, { status: 500 });
	}
};
