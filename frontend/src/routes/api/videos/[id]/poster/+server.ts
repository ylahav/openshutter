import { json } from '@sveltejs/kit';
import type { RequestHandler } from './$types';
import { env } from '$env/dynamic/private';
import { logger } from '$lib/utils/logger';
import { parseError } from '$lib/utils/errorHandler';
import { requireAdminOrOwner } from '$lib/server/admin-access';

const BACKEND_URL = env.BACKEND_URL || process.env.BACKEND_URL || 'http://localhost:5000';
const API_BASE = `${BACKEND_URL}/api`;

/** POST /api/videos/[id]/poster → backend POST /videos/[id]/poster (multipart). */
export const POST: RequestHandler = async ({ params, request, locals, cookies }) => {
	try {
		const denied = requireAdminOrOwner(locals);
		if (denied) return denied;
		const { id } = params;
		if (!id) return json({ success: false, error: 'Video ID is required' }, { status: 400 });

		const formData = await request.formData();
		const authToken = cookies.get('auth_token');
		const headers: HeadersInit = {};
		if (authToken) {
			headers['Authorization'] = `Bearer ${authToken}`;
			headers['Cookie'] = `auth_token=${authToken}`;
		}
		const backendResponse = await fetch(`${API_BASE}/videos/${id}/poster`, {
			method: 'POST',
			headers,
			body: formData
		});
		const data = await backendResponse.json().catch(() => ({
			error: `Backend returned ${backendResponse.status}: ${backendResponse.statusText}`
		}));
		return json(data, { status: backendResponse.status });
	} catch (error) {
		logger.error('[Video Poster] proxy error:', error);
		const parsed = parseError(error);
		return json(
			{ success: false, error: parsed.userMessage || parsed.message },
			{ status: parsed.status || 500 }
		);
	}
};
