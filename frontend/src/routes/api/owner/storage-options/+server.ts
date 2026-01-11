import { json } from '@sveltejs/kit';
import type { RequestHandler } from './$types';
import { backendGet, parseBackendResponse } from '$lib/utils/backend-api';

export const GET: RequestHandler = async ({ locals, cookies }) => {
	try {
		// Check owner access
		if (!locals.user || (locals.user.role !== 'owner' && locals.user.role !== 'admin')) {
			return json({ success: false, error: 'Unauthorized' }, { status: 401 });
		}

		// Get user's allowed storage providers
		const allowedProviders = locals.user.allowedStorageProviders || [];

		// Get all storage configs from backend
		const response = await backendGet('/admin/storage', { cookies });
		const configs = await parseBackendResponse<any[]>(response);

		// Filter to only enabled providers that the user has access to
		// Check both top-level isEnabled and config.isEnabled (for backward compatibility)
		const storageOptions = configs
			.filter((config) => {
				// Must be enabled - check both top level and config level
				const topLevelEnabled = config.isEnabled === true;
				const configLevelEnabled = config.config?.isEnabled === true;
				const isEnabled = topLevelEnabled || configLevelEnabled;
				
				if (!isEnabled) {
					return false;
				}
				// Must be in user's allowed providers (or user is admin)
				if (locals.user.role === 'admin') {
					return true;
				}
				return allowedProviders.includes(config.providerId);
			})
			.map((config) => ({
				id: config.providerId,
				name: config.name,
				type: config.providerId,
				isEnabled: true
			}));

		// If no providers are enabled, at least include local storage as a fallback
		// Local storage should always be available
		if (storageOptions.length === 0) {
			storageOptions.push({
				id: 'local',
				name: 'Local Storage',
				type: 'local',
				isEnabled: true
			});
		}

		return json({
			success: true,
			data: storageOptions
		});
	} catch (error) {
		console.error('Failed to get storage options:', error);
		const errorMessage = error instanceof Error ? error.message : String(error);
		return json({ success: false, error: errorMessage || 'Failed to get storage options' }, { status: 500 });
	}
};
