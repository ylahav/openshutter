import { json } from '@sveltejs/kit';
import type { RequestHandler } from './$types';
import {
	backendGet,
	backendDelete,
	backendRequest,
	parseBackendResponse
} from '$lib/utils/backend-api';
import { logger } from '$lib/utils/logger';
import { parseError } from '$lib/utils/errorHandler';

export const GET: RequestHandler = async ({ params, cookies }) => {
	try {
		const { id } = params;
		if (!id) return json({ success: false, error: 'Video ID is required' }, { status: 400 });
		const response = await backendGet(`/videos/${id}`, { cookies });
		const video = await parseBackendResponse<unknown>(response);
		return json(video);
	} catch (error) {
		logger.error('Failed to get video:', error);
		const parsed = parseError(error);
		return json(
			{ success: false, error: parsed.userMessage || parsed.message },
			{ status: parsed.status || 500 }
		);
	}
};

export const PUT: RequestHandler = async ({ params, request, cookies }) => {
	try {
		const { id } = params;
		if (!id) return json({ success: false, error: 'Video ID is required' }, { status: 400 });
		const body = await request.json();
		const response = await backendRequest(`/videos/${id}`, {
			method: 'PUT',
			cookies,
			body: JSON.stringify(body),
			headers: { 'Content-Type': 'application/json' }
		});
		const result = await parseBackendResponse<unknown>(response);
		return json(result);
	} catch (error) {
		logger.error('Failed to update video:', error);
		const parsed = parseError(error);
		return json(
			{ success: false, error: parsed.userMessage || parsed.message },
			{ status: parsed.status || 500 }
		);
	}
};

export const DELETE: RequestHandler = async ({ params, cookies }) => {
	try {
		const { id } = params;
		if (!id) return json({ success: false, error: 'Video ID is required' }, { status: 400 });
		const response = await backendDelete(`/videos/${id}`, { cookies });
		const result = await parseBackendResponse<unknown>(response);
		return json(result);
	} catch (error) {
		logger.error('Failed to delete video:', error);
		const parsed = parseError(error);
		return json(
			{ success: false, error: parsed.userMessage || parsed.message },
			{ status: parsed.status || 500 }
		);
	}
};
