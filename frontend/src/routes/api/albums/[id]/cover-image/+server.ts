import { json } from '@sveltejs/kit';
import type { RequestHandler } from './$types';
import { backendGet, parseBackendResponse } from '$lib/utils/backend-api';
import { logger } from '$lib/utils/logger';
import { parseError } from '$lib/utils/errorHandler';

export const GET: RequestHandler = async ({ params, cookies }) => {
	try {
		const { id } = await params;
		const endpoint = `/albums/${id}/cover-image`;
		const response = await backendGet(endpoint, { cookies });
		const result = await parseBackendResponse<any>(response);

		// Return the data directly with url property for album cards
		const data = result.data || result;
		return json(data);
	} catch (error) {
		logger.error('Error getting album cover image:', error);
		const parsed = parseError(error);
		return json(
			{ success: false, error: parsed.userMessage || `Failed to get album cover image: ${parsed.message}` },
			{ status: parsed.status || 500 }
		);
	}
};
