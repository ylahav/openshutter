import { json } from '@sveltejs/kit';
import type { RequestHandler } from './$types';
import { env } from '$env/dynamic/private';
import { logger } from '$lib/utils/logger';
import { parseError } from '$lib/utils/errorHandler';
import { requireAdminOrOwner } from '$lib/server/admin-access';

const BACKEND_URL = env.BACKEND_URL || process.env.BACKEND_URL || 'http://localhost:5000';
const API_BASE = `${BACKEND_URL}/api`;

/** NestJS HTTP exceptions use `message` for detail and `error` for the generic phrase (e.g. "Bad Request"). */
function backendErrorMessage(data: unknown, statusText: string): string {
	if (!data || typeof data !== 'object') {
		return `Upload failed: ${statusText}`;
	}
	const d = data as Record<string, unknown>;
	const msg = d.message;
	if (Array.isArray(msg)) {
		const joined = msg.map(String).filter(Boolean).join('; ');
		if (joined) return joined;
	}
	if (typeof msg === 'string' && msg.trim()) return msg;
	const err = d.error;
	if (typeof err === 'string' && err && err !== 'Bad Request') return err;
	return `Upload failed: ${statusText}`;
}

export const POST: RequestHandler = async ({ request, locals, cookies }) => {
	try {
		const denied = requireAdminOrOwner(locals);
		if (denied) return denied;

		const formData = await request.formData();
		const albumId = formData.get('albumId');
		const file = formData.get('file');
		logger.debug(`[Video Upload API] Received upload request:`, {
			albumId: albumId?.toString(),
			fileName: file instanceof File ? file.name : 'not a file',
			fileSize: file instanceof File ? file.size : 'unknown'
		});

		const authToken = cookies.get('auth_token');
		const headers: HeadersInit = {};
		if (authToken) {
			headers['Authorization'] = `Bearer ${authToken}`;
			headers['Cookie'] = `auth_token=${authToken}`;
		}

		const backendUrl = `${API_BASE}/videos/upload`;
		logger.debug(`[Video Upload API] Proxying upload to backend: ${backendUrl}`);

		const backendResponse = await fetch(backendUrl, {
			method: 'POST',
			headers,
			body: formData
		});

		if (backendResponse.status === 413) {
			const errorText = await backendResponse.text().catch(() => 'Request Entity Too Large');
			logger.error('[Video Upload API] 413 - File too large (likely nginx limit):', {
				status: 413,
				statusText: backendResponse.statusText,
				responseText: errorText.substring(0, 500)
			});
			return json(
				{
					success: false,
					error:
						"File too large: The video exceeds the server's upload size limit. Configure nginx with `client_max_body_size 500M;` for MP4 uploads."
				},
				{ status: 413 }
			);
		}

		const responseData = await backendResponse.json().catch(() => ({
			error: `Backend returned ${backendResponse.status}: ${backendResponse.statusText}`
		}));

		if (!backendResponse.ok) {
			logger.error('[Video Upload API] Backend error:', {
				status: backendResponse.status,
				statusText: backendResponse.statusText,
				error: responseData
			});
			return json(
				{
					success: false,
					error: backendErrorMessage(responseData, backendResponse.statusText)
				},
				{ status: backendResponse.status }
			);
		}

		logger.debug('[Video Upload API] Upload successful');
		return json(responseData, { status: backendResponse.status });
	} catch (error) {
		logger.error('[Video Upload API] Error proxying upload:', error);
		const parsed = parseError(error);

		if (
			parsed.message.includes('too large') ||
			parsed.message.includes('413') ||
			parsed.message.includes('Request Entity Too Large') ||
			parsed.message.includes('Content-length') ||
			parsed.message.includes('exceeds limit')
		) {
			return json(
				{
					success: false,
					error:
						"File too large: The video exceeds SvelteKit's body size limit. Set BODY_SIZE_LIMIT=500M and ensure nginx has `client_max_body_size 500M;`."
				},
				{ status: 413 }
			);
		}

		return json(
			{ success: false, error: parsed.userMessage || `Failed to upload video: ${parsed.message}` },
			{ status: parsed.status || 500 }
		);
	}
};
