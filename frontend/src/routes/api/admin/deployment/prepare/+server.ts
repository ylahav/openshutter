import { json } from '@sveltejs/kit';
import type { RequestHandler } from './$types';
import { backendPost, parseBackendResponse } from '$lib/utils/backend-api';
import { logger } from '$lib/utils/logger';
import { parseError } from '$lib/utils/errorHandler';

export const POST: RequestHandler = async ({ request, locals, cookies }) => {
	try {
		// Require admin access
		if (!locals.user || locals.user.role !== 'admin') {
			return json({ success: false, error: 'Forbidden' }, { status: 403 });
		}

		const config = await request.json();

		// Validate configuration
		if (!config.domain || config.domain === 'yourdomain.com') {
			return json({ success: false, error: 'Please provide a valid domain name' }, { status: 400 });
		}

		if (!config.port || config.port < 1 || config.port > 65535) {
			return json({ success: false, error: 'Please provide a valid port number' }, { status: 400 });
		}

		if (!config.appName || config.appName.trim() === '') {
			return json({ success: false, error: 'Please provide a valid app name' }, { status: 400 });
		}

		if (!config.projectRoot || config.projectRoot.trim() === '') {
			return json({ success: false, error: 'Please provide a valid project root path' }, { status: 400 });
		}

		// Note: The backend may return a file stream or JSON response
		// For now, we'll handle it as JSON and let the backend handle file generation
		const response = await backendPost('/admin/deployment/prepare', config, { cookies });
		
		// If the response is a file (blob), we need to handle it differently
		// For now, assume the backend returns JSON with a download URL or file data
		const result = await parseBackendResponse<{ success?: boolean; message?: string; downloadUrl?: string }>(response);

		return json({
			success: result.success !== undefined ? result.success : true,
			message: result.message,
			downloadUrl: result.downloadUrl
		});
	} catch (error) {
		logger.error('Deployment preparation error:', error);
		const parsed = parseError(error);
		return json(
			{ success: false, error: parsed.userMessage || 'Failed to prepare deployment' },
			{ status: parsed.status || 500 }
		);
	}
};
