import { json } from '@sveltejs/kit';
import type { RequestHandler } from './$types';
import { backendGet, parseBackendResponse } from '$lib/utils/backend-api';

export const GET: RequestHandler = async () => {
	try {
		const response = await backendGet('/init/check-default-password');
		const data = await parseBackendResponse<any>(response);
		return json(data);
	} catch (error) {
		console.error('Failed to check default password status:', error);
		const errorMessage = error instanceof Error ? error.message : 'Unknown error';
		return json({ showLandingPage: false, error: errorMessage }, { status: 500 });
	}
};
