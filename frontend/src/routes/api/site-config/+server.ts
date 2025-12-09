import { json } from '@sveltejs/kit';
import type { RequestHandler } from './$types';
import { backendGet, parseBackendResponse } from '$lib/utils/backend-api';

export const GET: RequestHandler = async ({ cookies }) => {
	try {
		// Fetch from the backend public endpoint
		const response = await backendGet('/site-config', { cookies });
		const config = await parseBackendResponse<any>(response);

		return json(config);
	} catch (error) {
		console.error('Failed to get site config:', error);
		const errorMessage = error instanceof Error ? error.message : String(error);
		return json({ error: `Failed to get site configuration: ${errorMessage}` }, { status: 500 });
	}
};
