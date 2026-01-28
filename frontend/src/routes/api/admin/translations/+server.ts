import { json } from '@sveltejs/kit';
import type { RequestHandler } from './$types';
import { backendGet, backendPost, backendPut, backendDelete, parseBackendResponse } from '$lib/utils/backend-api';
import { logger } from '$lib/utils/logger';
import { parseError } from '$lib/utils/errorHandler';

// Translations API route handler
export const GET: RequestHandler = async ({ locals, cookies, url }) => {
	try {
		// Require admin access
		if (!locals.user || locals.user.role !== 'admin') {
			return json({ success: false, error: 'Unauthorized' }, { status: 401 });
		}

		const languageCode = url.searchParams.get('languageCode');
		
		// If languageCode is provided, get translations for that language
		// Otherwise, get the list of all available languages
		const endpoint = languageCode 
			? `/admin/translations/${languageCode}`
			: '/admin/translations/languages';

		logger.debug('[Translations API] Calling backend endpoint:', endpoint);
		
		const response = await backendGet(endpoint, { cookies });
		const data = await parseBackendResponse<any>(response);

		logger.debug('[Translations API] Backend response parsed:', {
			dataType: typeof data,
			isArray: Array.isArray(data),
			keys: data && typeof data === 'object' ? Object.keys(data) : [],
			dataPreview: data && typeof data === 'object' ? JSON.stringify(data).substring(0, 300) : String(data)
		});

		return json({
			success: true,
			data
		});
	} catch (error) {
		logger.error('[Translations API] Failed to get translations:', error);
		const parsed = parseError(error);
		return json({ 
			success: false, 
			error: parsed.userMessage || 'Failed to get translations' 
		}, { status: parsed.status || 500 });
	}
};

export const POST: RequestHandler = async ({ request, locals, cookies, url }) => {
	try {
		// Require admin access
		if (!locals.user || locals.user.role !== 'admin') {
			return json({ success: false, error: 'Unauthorized' }, { status: 401 });
		}

		const body = await request.json();
		
		// Check if this is an auto-translate request
		if (body.action === 'auto-translate') {
			const languageCode = url.searchParams.get('languageCode');
			if (!languageCode) {
				return json({ success: false, error: 'Language code is required' }, { status: 400 });
			}

			const response = await backendPost(
				`/admin/translations/${languageCode}/auto-translate`,
				{ sourceLanguageCode: body.sourceLanguageCode || 'en' },
				{ cookies }
			);
			const data = await parseBackendResponse<any>(response);

			return json({
				success: true,
				data
			});
		}

		// Otherwise, create new language
		const response = await backendPost('/admin/translations', body, { cookies });
		const data = await parseBackendResponse<any>(response);

		return json({
			success: true,
			data
		});
	} catch (error) {
		logger.error('API: Failed to process request:', error);
		const parsed = parseError(error);
		return json({ 
			success: false, 
			error: parsed.userMessage || 'Failed to process request' 
		}, { status: parsed.status || 500 });
	}
};

export const PUT: RequestHandler = async ({ request, locals, cookies, url }) => {
	try {
		// Require admin access
		if (!locals.user || locals.user.role !== 'admin') {
			return json({ success: false, error: 'Unauthorized' }, { status: 401 });
		}

		const languageCode = url.searchParams.get('languageCode');
		if (!languageCode) {
			return json({ success: false, error: 'Language code is required' }, { status: 400 });
		}

		const body = await request.json();
		const response = await backendPut(`/admin/translations/${languageCode}`, body, { cookies });
		const data = await parseBackendResponse<any>(response);

		return json({
			success: true,
			data
		});
	} catch (error) {
		logger.error('API: Failed to update translations:', error);
		const parsed = parseError(error);
		return json({ 
			success: false, 
			error: parsed.userMessage || 'Failed to update translations' 
		}, { status: parsed.status || 500 });
	}
};

export const DELETE: RequestHandler = async ({ locals, cookies, url }) => {
	try {
		// Require admin access
		if (!locals.user || locals.user.role !== 'admin') {
			return json({ success: false, error: 'Unauthorized' }, { status: 401 });
		}

		const languageCode = url.searchParams.get('languageCode');
		if (!languageCode) {
			return json({ success: false, error: 'Language code is required' }, { status: 400 });
		}

		const response = await backendDelete(`/admin/translations/${languageCode}`, { cookies });
		const data = await parseBackendResponse<any>(response);

		return json({
			success: true,
			data
		});
	} catch (error) {
		logger.error('API: Failed to delete language:', error);
		const parsed = parseError(error);
		return json({ 
			success: false, 
			error: parsed.userMessage || 'Failed to delete language' 
		}, { status: parsed.status || 500 });
	}
};
