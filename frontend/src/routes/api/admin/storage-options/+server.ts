import { json } from '@sveltejs/kit';
import type { RequestHandler } from './$types';
import { backendGet, parseBackendResponse } from '$lib/utils/backend-api';

export const GET: RequestHandler = async ({ locals, cookies }) => {
	console.log('[storage-options] GET /api/admin/storage-options called');
	console.log('[storage-options] User:', locals.user?.role);
	
	try {
		// Check admin access
		if (!locals.user || locals.user.role !== 'admin') {
			console.log('[storage-options] Unauthorized access');
			return json({ success: false, error: 'Unauthorized' }, { status: 401 });
		}

		console.log('[storage-options] Fetching from backend /admin/storage');
		// Get all storage configs from backend
		const response = await backendGet('/admin/storage', { cookies });
		console.log('[storage-options] Backend response status:', response.status);
		const configs = await parseBackendResponse<any[]>(response);

		console.log('[storage-options] ===== STORAGE CONFIG DEBUG =====');
		console.log('[storage-options] All configs from backend:', JSON.stringify(configs, null, 2));
		console.log('[storage-options] Configs count:', configs?.length || 0);
		
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
		console.log('[storage-options] Configs type:', Array.isArray(configs) ? 'array' : typeof configs);
		console.log('[storage-options] Configs length:', Array.isArray(configs) ? configs.length : 'not an array');

		// Ensure configs is an array
		if (!Array.isArray(configs)) {
			console.error('[storage-options] Backend did not return an array:', configs);
			return json({
				success: true,
				data: []
			});
		}

		// Log each config's isEnabled status
		configs.forEach((config) => {
			console.log(`[storage-options] Config ${config.providerId}:`, {
				isEnabled: config.isEnabled,
				isEnabledType: typeof config.isEnabled,
				isEnabledValue: config.isEnabled,
				isEnabledStrict: config.isEnabled === true,
				isEnabledLoose: config.isEnabled == true,
				configObject: config
			});
		});

		// Filter to only enabled providers and format for frontend
		// Check both top-level isEnabled and config.isEnabled (for backward compatibility)
		const storageOptions = configs
			.filter((config) => {
				// Check isEnabled at top level OR in config object (storage settings page checks both)
				const topLevelEnabled = config.isEnabled === true;
				const configLevelEnabled = config.config?.isEnabled === true;
				const isEnabled = topLevelEnabled || configLevelEnabled;
				
				console.log(`[storage-options] Filtering ${config.providerId}:`, {
					topLevel: config.isEnabled,
					configLevel: config.config?.isEnabled,
					topLevelEnabled,
					configLevelEnabled,
					willInclude: isEnabled
				});
				
				return isEnabled;
			})
			.map((config) => ({
				id: config.providerId,
				name: config.name,
				type: config.providerId,
				isEnabled: true
			}));

		console.log('[storage-options] Filtered storage options:', JSON.stringify(storageOptions, null, 2));

		// If no providers are enabled, don't add any fallback
		// Users must enable at least one storage provider in the admin panel
		if (storageOptions.length === 0) {
			console.warn('[storage-options] No enabled providers found! Users must enable at least one storage provider in the admin panel.');
		}

		return json({
			success: true,
			data: storageOptions
		});
	} catch (error) {
		console.error('[storage-options] Error in GET handler:', error);
		console.error('[storage-options] Error stack:', error instanceof Error ? error.stack : 'No stack trace');
		const errorMessage = error instanceof Error ? error.message : String(error);
		return json({ 
			success: false, 
			error: errorMessage || 'Failed to get storage options',
			details: error instanceof Error ? error.stack : undefined
		}, { status: 500 });
	}
};
