import { json } from '@sveltejs/kit';
import type { RequestHandler } from './$types';
import { backendGet, parseBackendResponse } from '$lib/utils/backend-api';
import { logger } from '$lib/utils/logger';
import { parseError } from '$lib/utils/errorHandler';

export const GET: RequestHandler = async ({ locals, cookies }) => {
	try {
		// Check admin access
		if (!locals.user || locals.user.role !== 'admin') {
			return json({ success: false, error: 'Unauthorized' }, { status: 401 });
		}

		// Get all storage configs from backend
		const response = await backendGet('/admin/storage', { cookies });
		const configs = await parseBackendResponse<any[]>(response);

		// Ensure configs is an array
		if (!Array.isArray(configs)) {
			logger.error('[storage-options] Backend did not return an array:', configs);
			return json({
				success: true,
				data: []
			});
		}

		// Filter to only enabled providers and format for frontend
		// Check both top-level isEnabled and config.isEnabled (for backward compatibility)
		const storageOptions = configs
			.filter((config) => {
				// Check isEnabled at top level OR in config object (storage settings page checks both)
				const topLevelEnabled = config.isEnabled === true;
				const configLevelEnabled = config.config?.isEnabled === true;
				return topLevelEnabled || configLevelEnabled;
			})
			.map((config) => ({
				id: config.providerId,
				name: config.name,
				type: config.providerId,
				isEnabled: true
			}));

		return json({
			success: true,
			data: storageOptions
		});
	} catch (error) {
		logger.error('[storage-options] Failed to get storage options:', error);
		const parsed = parseError(error);
		return json({ 
			success: false, 
			error: parsed.userMessage || 'Failed to get storage options'
		}, { status: parsed.status || 500 });
	}
};
