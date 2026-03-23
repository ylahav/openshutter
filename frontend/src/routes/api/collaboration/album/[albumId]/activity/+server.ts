import { json } from '@sveltejs/kit';
import type { RequestHandler } from './$types';
import { backendGet, parseBackendResponse } from '$lib/utils/backend-api';
import { logger } from '$lib/utils/logger';
import { parseError } from '$lib/utils/errorHandler';

export const GET: RequestHandler = async ({ params, cookies }) => {
	try {
		const { albumId } = await params;
		const response = await backendGet(
			`/collaboration/album/${encodeURIComponent(albumId)}/activity`,
			{ cookies },
		);
		const data = await parseBackendResponse<any>(response);
		return json(data);
	} catch (error) {
		logger.error('API: collaboration activity:', error);
		const parsed = parseError(error);
		return json(
			{ error: parsed.userMessage || parsed.message },
			{ status: parsed.status || 500 },
		);
	}
};
