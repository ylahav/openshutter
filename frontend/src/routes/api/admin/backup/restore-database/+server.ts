import { json } from '@sveltejs/kit';
import type { RequestHandler } from './$types';
import { backendPost, parseBackendResponse } from '$lib/utils/backend-api';

export const POST: RequestHandler = async ({ request, locals, cookies }) => {
	try {
		// Require admin access
		if (!locals.user || locals.user.role !== 'admin') {
			return json({ success: false, error: 'Unauthorized' }, { status: 401 });
		}

		const body = await request.json();
		const { backup } = body;

		if (!backup || !backup.collections) {
			return json({ success: false, error: 'Invalid backup format' }, { status: 400 });
		}

		const response = await backendPost('/admin/backup/restore-database', { backup }, { cookies });
		const result = await parseBackendResponse<{ success?: boolean; message?: string }>(response);

		return json({
			success: result.success !== undefined ? result.success : true,
			message: result.message || 'Database restored successfully'
		});
	} catch (error) {
		console.error('Database restore error:', error);
		const errorMessage = error instanceof Error ? error.message : String(error);
		return json(
			{ success: false, error: errorMessage || 'Failed to restore database' },
			{ status: 500 }
		);
	}
};
