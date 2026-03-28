import { derived, writable } from 'svelte/store';
import { siteConfigData } from '$stores/siteConfig';
import { browser } from '$app/environment';
import { auth } from '$lib/stores/auth';
import { page } from '$app/stores';
import type { SiteConfig } from '$lib/types/site-config';

const ADMIN_PREVIEW_TEMPLATE_KEY = 'adminPreviewTemplate';
const ADMIN_PREVIEW_THEME_ID_KEY = 'adminPreviewThemeId';
const adminPreviewTemplate = writable<string | null>(null);
const adminPreviewThemeId = writable<string | null>(null);

if (browser) {
	adminPreviewTemplate.set(localStorage.getItem(ADMIN_PREVIEW_TEMPLATE_KEY));
	adminPreviewThemeId.set(localStorage.getItem(ADMIN_PREVIEW_THEME_ID_KEY));
}

/**
 * Helper function to get the template name based on area (frontend or admin)
 * Supports backward compatibility with activeTemplate
 */
function getTemplateForArea(config: SiteConfig | null, area: 'frontend' | 'admin'): string {
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
	[siteConfigData, auth, page, adminPreviewTemplate],
	([$config, $auth, $page, $adminPreviewTemplate]) => {
		const isAdminRoute = $page.url.pathname.startsWith('/admin');
		
		// Admin area: allow temporary preview override for quick visual checks.
		if (isAdminRoute) {
			const previewTemplate = $adminPreviewTemplate;
			if (previewTemplate && ['minimal', 'modern', 'elegant', 'default'].includes(previewTemplate)) {
				return previewTemplate === 'default' ? 'minimal' : previewTemplate;
			}
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

export function setAdminPreviewTemplate(templateName: string, themeId?: string): void {
	if (!browser) return;
	if (!['minimal', 'modern', 'elegant', 'default'].includes(templateName)) return;
	localStorage.setItem(ADMIN_PREVIEW_TEMPLATE_KEY, templateName);
	adminPreviewTemplate.set(templateName);
	if (themeId) {
		localStorage.setItem(ADMIN_PREVIEW_THEME_ID_KEY, themeId);
		adminPreviewThemeId.set(themeId);
	} else {
		localStorage.removeItem(ADMIN_PREVIEW_THEME_ID_KEY);
		adminPreviewThemeId.set(null);
	}
}

export function clearAdminPreviewTemplate(): void {
	if (!browser) return;
	localStorage.removeItem(ADMIN_PREVIEW_TEMPLATE_KEY);
	localStorage.removeItem(ADMIN_PREVIEW_THEME_ID_KEY);
	adminPreviewTemplate.set(null);
	adminPreviewThemeId.set(null);
}

export function getAdminPreviewTemplate(): string | null {
	if (!browser) return null;
	return localStorage.getItem(ADMIN_PREVIEW_TEMPLATE_KEY);
}

export function getAdminPreviewThemeId(): string | null {
	if (!browser) return null;
	return localStorage.getItem(ADMIN_PREVIEW_THEME_ID_KEY);
}

