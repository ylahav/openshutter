import { json } from '@sveltejs/kit';
import type { RequestHandler } from './$types';
import { backendRequest, parseBackendResponse } from '$lib/utils/backend-api';
import { logger } from '$lib/utils/logger';
import { parseError } from '$lib/utils/errorHandler';

// PUT /api/admin/owner-domains/[id] -> backend PUT /admin/owner-domains/:id
export const PUT: RequestHandler = async ({ params, request, cookies }) => {
	try {
		const body = await request.json();
		const endpoint = `/admin/owner-domains/${encodeURIComponent(params.id)}`;
		const response = await backendRequest(endpoint, {
			method: 'PUT',
			cookies,
			body: JSON.stringify(body),
		});
		const data = await parseBackendResponse<any>(response);
		return json(data);
	} catch (error) {
		logger.error('Failed to update owner domain:', error);
		const parsed = parseError(error);
		return json(
			{ error: parsed.userMessage || 'Failed to update owner domain' },
			{ status: parsed.status || 500 },
		);
	}
};

// DELETE /api/admin/owner-domains/[id] -> backend DELETE /admin/owner-domains/:id
export const DELETE: RequestHandler = async ({ params, cookies }) => {
	try {
		const endpoint = `/admin/owner-domains/${encodeURIComponent(params.id)}`;
		const response = await backendRequest(endpoint, {
			method: 'DELETE',
			cookies,
		});
		const data = await parseBackendResponse<any>(response);
		return json(data);
	} catch (error) {
		logger.error('Failed to delete owner domain:', error);
		const parsed = parseError(error);
		return json(
			{ error: parsed.userMessage || 'Failed to delete owner domain' },
			{ status: parsed.status || 500 },
		);
	}
};

