import { derived } from 'svelte/store';
import { siteConfigData } from '$stores/siteConfig';
import { browser } from '$app/environment';
import { auth } from '$lib/stores/auth';
import { page } from '$app/stores';

/**
 * Helper function to get the template name based on area (frontend or admin)
 * Supports backward compatibility with activeTemplate
 */
function getTemplateForArea(config: any, area: 'frontend' | 'admin'): string {
	if (area === 'admin') {
		return config?.template?.adminTemplate || config?.template?.activeTemplate || 'default';
	} else {
		return config?.template?.frontendTemplate || config?.template?.activeTemplate || 'modern';
	}
}

/**
 * Active template name, determined by route (admin vs frontend).
 * For admin routes, uses adminTemplate (or activeTemplate as fallback).
 * For frontend routes, uses frontendTemplate (or activeTemplate as fallback).
 * For non-admin users on frontend, checks localStorage for preferred template.
 */
export const activeTemplate = derived(
	[siteConfigData, auth, page],
	([$config, $auth, $page]) => {
		const isAdminRoute = $page.url.pathname.startsWith('/admin');
		
		// Admin area: always use admin template from site config
		if (isAdminRoute) {
			return getTemplateForArea($config, 'admin');
		}

		// Frontend area: check localStorage first for non-admin users
		if (browser && (!$auth.authenticated || $auth.user?.role !== 'admin')) {
			const preferredTemplate = localStorage.getItem('preferredTemplate');
			// Map 'default' to 'minimal' since they're essentially the same
			if (preferredTemplate && ['minimal', 'modern', 'elegant', 'default'].includes(preferredTemplate)) {
				return preferredTemplate === 'default' ? 'minimal' : preferredTemplate;
			}
		}

		// Use frontend template from site config
		return getTemplateForArea($config, 'frontend');
	}
);

