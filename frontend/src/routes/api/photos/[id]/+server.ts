import { json } from '@sveltejs/kit';
import type { RequestHandler } from './$types';
import { backendGet, parseBackendResponse } from '$lib/utils/backend-api';
import { logger } from '$lib/utils/logger';
import { parseError } from '$lib/utils/errorHandler';

export const GET: RequestHandler = async ({ params }) => {
	try {
		const { id } = await params;

		if (!id) {
			return json({ success: false, error: 'Photo ID is required' }, { status: 400 });
		}

		const response = await backendGet(`/photos/${id}`);
		const photo = await parseBackendResponse<any>(response);

		return json(photo);
	} catch (error) {
		logger.error('Failed to get photo:', error);
		const parsed = parseError(error);
		return json({ 
			success: false, 
			error: parsed.userMessage || `Failed to get photo: ${parsed.message}` 
		}, { status: parsed.status || 500 });
	}
};
