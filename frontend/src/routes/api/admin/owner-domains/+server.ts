import { json } from '@sveltejs/kit';
import type { RequestHandler } from './$types';
import { backendGet, backendRequest, parseBackendResponse } from '$lib/utils/backend-api';
import { logger } from '$lib/utils/logger';
import { parseError } from '$lib/utils/errorHandler';

// GET /api/admin/owner-domains -> backend GET /admin/owner-domains
export const GET: RequestHandler = async ({ url, cookies }) => {
	try {
		const searchParams = url.searchParams.toString();
		const endpoint = `/admin/owner-domains${searchParams ? `?${searchParams}` : ''}`;
		const response = await backendGet(endpoint, { cookies });
		const data = await parseBackendResponse<any>(response);
		return json(data);
	} catch (error) {
		logger.error('Failed to load owner domains:', error);
		const parsed = parseError(error);
		return json(
			{ error: parsed.userMessage || 'Failed to load owner domains' },
			{ status: parsed.status || 500 },
		);
	}
};

// POST /api/admin/owner-domains -> backend POST /admin/owner-domains
export const POST: RequestHandler = async ({ request, cookies }) => {
	try {
		const body = await request.json();
		const response = await backendRequest('/admin/owner-domains', {
			method: 'POST',
			cookies,
			body: JSON.stringify(body),
		});
		const data = await parseBackendResponse<any>(response);
		return json(data);
	} catch (error) {
		logger.error('Failed to create owner domain:', error);
		const parsed = parseError(error);
		return json(
			{ error: parsed.userMessage || 'Failed to create owner domain' },
			{ status: parsed.status || 500 },
		);
	}
};

// PUT /api/admin/owner-domains/[id] and DELETE are handled by a separate route file

