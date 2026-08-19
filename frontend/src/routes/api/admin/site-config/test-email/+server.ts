import { json } from '@sveltejs/kit';
import type { RequestHandler } from './$types';
import { backendPost, parseBackendResponse } from '$lib/utils/backend-api';
import { logger } from '$lib/utils/logger';
import { parseError } from '$lib/utils/errorHandler';
import { requireAdmin } from '$lib/server/admin-access';

export const POST: RequestHandler = async ({ request, locals, cookies }) => {
	try {
		const denied = requireAdmin(locals);
		if (denied) return denied;

		const body = await request.json();
		const to = body?.to?.trim();
		if (!to) {
			return json({ success: false, error: 'Recipient (to) is required' }, { status: 400 });
		}

		const response = await backendPost(
			'/admin/site-config/test-email',
			{
				to,
				subject: body.subject ?? 'Test email',
				body: body.body ?? 'This is a test email from OpenShutter.',
			},
			{ cookies }
		);
		const result = await parseBackendResponse<{ success: boolean; error?: string }>(response);
		return json(result);
	} catch (error) {
		logger.error('API: Send test email failed:', error);
		const parsed = parseError(error);
		return json(
			{ success: false, error: parsed.userMessage || 'Failed to send test email' },
			{ status: parsed.status || 500 }
		);
	}
};
