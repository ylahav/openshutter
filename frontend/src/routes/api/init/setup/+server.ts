import { json } from '@sveltejs/kit';
import type { RequestHandler } from './$types';
import { env } from '$env/dynamic/private';

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
		console.error('Failed to complete setup:', error);
		const errorMessage = error instanceof Error ? error.message : 'Unknown error';
		return json({ success: false, error: errorMessage }, { status: 500 });
	}
};
