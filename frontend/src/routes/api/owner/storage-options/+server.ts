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

		console.log('[storage-options] ===== STORAGE CONFIG DEBUG =====');
		console.log('[storage-options] All configs from backend:', JSON.stringify(configs, null, 2));
		console.log('[storage-options] Configs count:', configs?.length || 0);
		console.log('[storage-options] User allowed providers:', allowedProviders);
		
		// Log each config in detail
		if (Array.isArray(configs)) {
			configs.forEach((config, index) => {
				console.log(`[storage-options] Config ${index + 1} (${config.providerId}):`, {
					providerId: config.providerId,
					name: config.name,
					isEnabled: config.isEnabled,
					isEnabledType: typeof config.isEnabled,
					configObject: config.config,
					configIsEnabled: config.config?.isEnabled,
					fullConfig: config
				});
			});
		}
		console.log('[storage-options] ===== END STORAGE CONFIG DEBUG =====');

		// Filter to only enabled providers that the user has access to
		const storageOptions = configs
			.filter((config) => {
				// Must be enabled - check both top level and config level (for backward compatibility)
				const topLevelEnabled = config.isEnabled === true;
				const configLevelEnabled = config.config?.isEnabled === true;
				const isEnabled = topLevelEnabled || configLevelEnabled;
				
				if (!isEnabled) {
					console.log(`[storage-options] ${config.providerId}: disabled (topLevel=${topLevelEnabled}, configLevel=${configLevelEnabled}), skipping`);
					return false;
				}
				// Must be in user's allowed providers (or user is admin)
				if (locals.user.role === 'admin') {
					console.log(`[storage-options] ${config.providerId}: admin user, allowing`);
					return true;
				}
				const hasAccess = allowedProviders.includes(config.providerId);
				console.log(`[storage-options] ${config.providerId}: hasAccess=${hasAccess}`);
				return hasAccess;
			})
			.map((config) => ({
				id: config.providerId,
				name: config.name,
				type: config.providerId,
				isEnabled: config.isEnabled
			}));

		console.log('[storage-options] Filtered storage options:', JSON.stringify(storageOptions, null, 2));

		// If no providers are enabled, at least include local storage as a fallback
		// Local storage should always be available
		if (storageOptions.length === 0) {
			console.warn('[storage-options] No enabled providers found, adding local storage as fallback');
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
