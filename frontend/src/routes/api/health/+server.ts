import { json } from '@sveltejs/kit';
import type { RequestHandler } from './$types';
import { env } from '$env/dynamic/private';
import { logger } from '$lib/utils/logger';
import { parseError } from '$lib/utils/errorHandler';

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
		logger.error('Health check failed:', error);
		const parsed = parseError(error);
		return json(
			{ status: 'error', message: parsed.userMessage || `Backend unreachable: ${parsed.message}` },
			{ status: parsed.status || 503 }
		);
	}
};
