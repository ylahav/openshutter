import { derived } from 'svelte/store';
import { siteConfigData } from '$stores/siteConfig';
import { browser } from '$app/environment';
import { auth } from '$lib/stores/auth';

/**
 * Active template name, as configured in siteConfig.template.activeTemplate.
 * For non-admin users, checks localStorage for preferred template.
 * Falls back to 'modern' for public pages.
 */
export const activeTemplate = derived(
	[siteConfigData, auth],
	([$config, $auth]) => {
		// Admin users always use site config
		if ($auth.authenticated && $auth.user?.role === 'admin') {
			return $config?.template?.activeTemplate || 'modern';
		}

		// Non-admin users: check localStorage first, then site config
		if (browser) {
			const preferredTemplate = localStorage.getItem('preferredTemplate');
			// Map 'default' to 'minimal' since they're essentially the same
			if (preferredTemplate && ['minimal', 'modern', 'elegant', 'default'].includes(preferredTemplate)) {
				return preferredTemplate === 'default' ? 'minimal' : preferredTemplate;
			}
		}

		return $config?.template?.activeTemplate || 'modern';
	}
);

