import { json } from '@sveltejs/kit';
import type { RequestHandler } from './$types';
import { env } from '$env/dynamic/private';

export const GET: RequestHandler = async () => {
	try {
		const BACKEND_URL = env.BACKEND_URL || process.env.BACKEND_URL || 'http://localhost:5000';
		const response = await fetch(`${BACKEND_URL}/api/health`);
		
		if (!response.ok) {
			return json(
				{ status: 'error', message: `Backend returned ${response.status}` },
				{ status: response.status }
			);
		}
		
		const data = await response.json();
		return json(data);
	} catch (error) {
		console.error('Health check failed:', error);
		const errorMessage = error instanceof Error ? error.message : 'Unknown error';
		return json(
			{ status: 'error', message: `Backend unreachable: ${errorMessage}` },
			{ status: 503 }
		);
	}
};
