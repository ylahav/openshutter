import { json } from '@sveltejs/kit';
import type { RequestHandler } from './$types';
import { backendPatch, parseBackendResponse } from '$lib/utils/backend-api';
import { logger } from '$lib/utils/logger';
import { parseError } from '$lib/utils/errorHandler';

export const PATCH: RequestHandler = async ({ params, request, cookies }) => {
	try {
		const { taskId } = await params;
		const body = await request.json().catch(() => ({}));
		const response = await backendPatch(
			`/collaboration/tasks/${encodeURIComponent(taskId)}`,
			body,
			{ cookies },
		);
		const data = await parseBackendResponse<any>(response);
		return json(data, { status: response.status });
	} catch (error) {
		logger.error('API: collaboration task PATCH:', error);
		const parsed = parseError(error);
		return json(
			{ error: parsed.userMessage || parsed.message },
			{ status: parsed.status || 500 },
		);
	}
};
