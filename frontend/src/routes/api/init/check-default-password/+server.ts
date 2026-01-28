import { json } from '@sveltejs/kit';
import type { RequestHandler } from './$types';
import { backendGet, parseBackendResponse } from '$lib/utils/backend-api';
import { logger } from '$lib/utils/logger';
import { parseError } from '$lib/utils/errorHandler';

export const GET: RequestHandler = async () => {
	try {
		const response = await backendGet('/init/check-default-password');
		const data = await parseBackendResponse<any>(response);
		return json(data);
	} catch (error) {
		logger.error('Failed to check default password status:', error);
		const parsed = parseError(error);
		return json({ 
			showLandingPage: false, 
			error: parsed.userMessage || parsed.message 
		}, { status: parsed.status || 500 });
	}
};
