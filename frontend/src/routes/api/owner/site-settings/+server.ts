import { json } from '@sveltejs/kit';
import type { RequestHandler } from './$types';
import { backendGet, backendRequest, parseBackendResponse } from '$lib/utils/backend-api';
import { logger } from '$lib/utils/logger';
import { parseError } from '$lib/utils/errorHandler';

// GET /api/owner/site-settings -> proxy to backend /owner/site-settings (owner-only)
export const GET: RequestHandler = async ({ cookies }) => {
	try {
		const response = await backendGet('/owner/site-settings', { cookies });
		const data = await parseBackendResponse<any>(response);
		return json({ success: true, data });
	} catch (error) {
		logger.error('Failed to get owner site settings:', error);
		const parsed = parseError(error);
		return json(
			{
				success: false,
				error: parsed.userMessage || 'Failed to load owner site settings',
			},
			{ status: parsed.status || 500 },
		);
	}
};

// PATCH /api/owner/site-settings -> proxy JSON body to backend
export const PATCH: RequestHandler = async ({ request, cookies }) => {
	try {
		const body = await request.json();
		const response = await backendRequest('/owner/site-settings', {
			method: 'PATCH',
			cookies,
			// backendRequest expects a serialized body when using JSON
			body: JSON.stringify(body),
		});
		const data = await parseBackendResponse<any>(response);
		return json({ success: true, data });
	} catch (error) {
		logger.error('Failed to update owner site settings:', error);
		const parsed = parseError(error);
		return json(
			{
				success: false,
				error: parsed.userMessage || 'Failed to save owner site settings',
			},
			{ status: parsed.status || 500 },
		);
	}
};

// POST /api/owner/site-settings/upload-logo -> proxy multipart form-data to backend
export const POST: RequestHandler = async ({ request, cookies, url }) => {
	try {
		// Only handle the upload-logo subpath in this handler
		if (!url.pathname.endsWith('/upload-logo')) {
			return json({ success: false, error: 'Not found' }, { status: 404 });
		}

		const formData = await request.formData();
		const response = await backendRequest('/owner/site-settings/upload-logo', {
			method: 'POST',
			cookies,
			body: formData,
		});
		const data = await parseBackendResponse<any>(response);
		return json({ success: true, data });
	} catch (error) {
		logger.error('Failed to upload owner logo:', error);
		const parsed = parseError(error);
		return json(
			{
				success: false,
				error: parsed.userMessage || 'Failed to upload logo',
			},
			{ status: parsed.status || 500 },
		);
	}
};

