import { json } from '@sveltejs/kit';
import type { RequestHandler } from './$types';
import { backendGet, backendPost, parseBackendResponse } from '$lib/utils/backend-api';
import { logger } from '$lib/utils/logger';
import { parseError } from '$lib/utils/errorHandler';

export const GET: RequestHandler = async ({ params, cookies }) => {
	try {
		const { albumId } = await params;
		const response = await backendGet(
			`/collaboration/album/${encodeURIComponent(albumId)}/tasks`,
			{ cookies },
		);
		const data = await parseBackendResponse<any>(response);
		return json(data);
	} catch (error) {
		logger.error('API: collaboration tasks GET:', error);
		const parsed = parseError(error);
		return json(
			{ error: parsed.userMessage || parsed.message },
			{ status: parsed.status || 500 },
		);
	}
};

export const POST: RequestHandler = async ({ params, request, cookies }) => {
	try {
		const { albumId } = await params;
		const body = await request.json().catch(() => ({}));
		const response = await backendPost(
			`/collaboration/album/${encodeURIComponent(albumId)}/tasks`,
			body,
			{ cookies },
		);
		const data = await parseBackendResponse<any>(response);
		return json(data, { status: response.status });
	} catch (error) {
		logger.error('API: collaboration tasks POST:', error);
		const parsed = parseError(error);
		return json(
			{ error: parsed.userMessage || parsed.message },
			{ status: parsed.status || 500 },
		);
	}
};
