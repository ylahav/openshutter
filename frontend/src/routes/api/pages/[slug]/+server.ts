import { json } from '@sveltejs/kit';
import type { RequestHandler } from './$types';
import { backendGet, parseBackendResponse } from '$lib/utils/backend-api';
import { logger } from '$lib/utils/logger';
import { parseError } from '$lib/utils/errorHandler';

export const GET: RequestHandler = async ({ params, cookies }) => {
	try {
		const { slug } = params;
		const response = await backendGet(`/pages/${slug}`, { cookies });
		const pageData = await parseBackendResponse<{ page: any; modules: any[] }>(response);

		return json({
			success: true,
			data: pageData
		});
	} catch (error) {
		logger.error('Public page API error:', error);
		const parsed = parseError(error);
		return json({ 
			success: false, 
			error: parsed.userMessage || 'Failed to fetch page' 
		}, { status: parsed.status || 500 });
	}
};
