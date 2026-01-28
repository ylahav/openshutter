import { json } from '@sveltejs/kit';
import type { RequestHandler } from './$types';
import { backendPost, parseBackendResponse } from '$lib/utils/backend-api';
import { logger } from '$lib/utils/logger';
import { parseError } from '$lib/utils/errorHandler';

export const POST: RequestHandler = async ({ locals, cookies }) => {
	try {
		// Require admin access
		if (!locals.user || locals.user.role !== 'admin') {
			return json({ success: false, error: 'Unauthorized' }, { status: 401 });
		}

		const response = await backendPost('/admin/backup/database', {}, { cookies });
		const result = await parseBackendResponse<{ success?: boolean; backup?: any; message?: string }>(response);

		return json({
			success: result.success !== undefined ? result.success : true,
			backup: result.backup,
			message: result.message || 'Backup created successfully'
		});
	} catch (error) {
		logger.error('Database backup error:', error);
		const parsed = parseError(error);
		return json(
			{ success: false, error: parsed.userMessage || 'Failed to create database backup' },
			{ status: parsed.status || 500 }
		);
	}
};
