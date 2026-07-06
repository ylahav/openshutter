import { json } from '@sveltejs/kit';
import type { RequestHandler } from './$types';
import { env } from '$env/dynamic/private';
import { logger } from '$lib/utils/logger';
import { parseError } from '$lib/utils/errorHandler';

const BACKEND_URL = env.BACKEND_URL || process.env.BACKEND_URL || 'http://localhost:5000';
const API_BASE = `${BACKEND_URL}/api`;

export const POST: RequestHandler = async ({ request, locals, cookies }) => {
	try {
		if (!locals.user || (locals.user.role !== 'admin' && locals.user.role !== 'owner')) {
			return json({ success: false, error: 'Unauthorized' }, { status: 401 });
		}
		const body = await request.json();
		const authToken = cookies.get('auth_token');
		const headers: HeadersInit = { 'Content-Type': 'application/json' };
		if (authToken) {
			headers['Authorization'] = `Bearer ${authToken}`;
			headers['Cookie'] = `auth_token=${authToken}`;
		}
		const backendResponse = await fetch(`${API_BASE}/videos/upload-finalize`, {
			method: 'POST',
			headers,
			body: JSON.stringify(body)
		});
		const data = await backendResponse.json().catch(() => ({
			error: `Backend returned ${backendResponse.status}: ${backendResponse.statusText}`
		}));
		if (!backendResponse.ok) {
			return json(data, { status: backendResponse.status });
		}
		return json(data, { status: backendResponse.status });
	} catch (error) {
		logger.error('[Video Upload Finalize] proxy error:', error);
		const parsed = parseError(error);
		return json(
			{ success: false, error: parsed.userMessage || parsed.message },
			{ status: parsed.status || 500 }
		);
	}
};
