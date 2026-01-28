import { json } from '@sveltejs/kit';
import type { RequestHandler } from './$types';
import { env } from '$env/dynamic/private';
import { logger } from '$lib/utils/logger';
import { parseError } from '$lib/utils/errorHandler';

export const POST: RequestHandler = async ({ request }) => {
	try {
		const BACKEND_URL = env.BACKEND_URL || process.env.BACKEND_URL || 'http://localhost:5000';
		const formData = await request.formData();

		// Forward the form data to backend
		const response = await fetch(`${BACKEND_URL}/api/init/setup`, {
			method: 'POST',
			body: formData,
		});

		if (!response.ok) {
			const errorData = await response.json().catch(() => ({ message: 'Request failed' }));
			return json(
				{ success: false, error: errorData.message || errorData.error || 'Setup failed' },
				{ status: response.status }
			);
		}

		const data = await response.json();
		return json(data);
	} catch (error) {
		logger.error('Failed to complete setup:', error);
		const parsed = parseError(error);
		return json({ 
			success: false, 
			error: parsed.userMessage || parsed.message 
		}, { status: parsed.status || 500 });
	}
};
