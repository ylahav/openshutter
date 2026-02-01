import type { RequestHandler } from './$types';
import { backendRequest } from '$lib/utils/backend-api';
import { logger } from '$lib/utils/logger';

/** Proxies to backend streaming endpoint and returns NDJSON progress stream */
export const POST: RequestHandler = async ({ request, locals, cookies }) => {
	try {
		if (!locals.user || locals.user.role !== 'admin') {
			return new Response(JSON.stringify({ success: false, error: 'Unauthorized' }), {
				status: 401,
				headers: { 'Content-Type': 'application/json' }
			});
		}

		const body = await request.json();
		const response = await backendRequest('/admin/photos/bulk/regenerate-thumbnails-stream', {
			method: 'POST',
			body: JSON.stringify(body),
			cookies
		});

		if (!response.ok) {
			const err = await response.json().catch(() => ({ error: 'Unknown error' }));
			return new Response(JSON.stringify(err), {
				status: response.status,
				headers: { 'Content-Type': 'application/json' }
			});
		}

		return new Response(response.body, {
			headers: {
				'Content-Type': 'application/x-ndjson',
				'Cache-Control': 'no-store'
			}
		});
	} catch (error) {
		logger.error('Bulk regenerate thumbnails stream error:', error);
		return new Response(
			JSON.stringify({
				success: false,
				error: error instanceof Error ? error.message : 'Failed to start regenerate stream'
			}),
			{ status: 500, headers: { 'Content-Type': 'application/json' } }
		);
	}
};
