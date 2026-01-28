import { json } from '@sveltejs/kit';
import type { RequestHandler } from './$types';
import { backendGet, parseBackendResponse } from '$lib/utils/backend-api';
import { logger } from '$lib/utils/logger';
import { parseError } from '$lib/utils/errorHandler';

export const GET: RequestHandler = async ({ params, locals, cookies }) => {
	try {
		const { id } = await params;

		if (!id) {
			return json({ success: false, error: 'Person ID is required' }, { status: 400 });
		}

		// Use admin endpoint to get person (requires authentication)
		const response = await backendGet(`/admin/people/${id}`, { cookies });
		const person = await parseBackendResponse<any>(response);

		return json({
			success: true,
			data: person
		});
	} catch (error) {
		logger.error('Failed to get person:', error);
		const parsed = parseError(error);
		return json({ 
			success: false, 
			error: parsed.userMessage || `Failed to get person: ${parsed.message}` 
		}, { status: parsed.status || 500 });
	}
};
