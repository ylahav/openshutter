import { derived } from 'svelte/store';
import { siteConfigData } from '$stores/siteConfig';
import { browser } from '$app/environment';
import { auth } from '$lib/stores/auth';
import { page } from '$app/stores';
import type { SiteConfig } from '$lib/types/site-config';

function getFrontendTemplateName(config: SiteConfig | null): string {
	return config?.template?.frontendTemplate || config?.template?.activeTemplate || 'modern';
}

/**
 * Resolved visitor template pack id for **public** routes only.
 * On `/admin`, returns `'default'` — admin uses a fixed shell (see `AdminAppChrome` + Skeleton);
 * this store value must not drive admin styling.
 */
export const activeTemplate = derived(
	[siteConfigData, auth, page],
	([$config, $auth, $page]) => {
		if ($page.url.pathname.startsWith('/admin')) {
			return 'default';
		}

		if (browser && (!$auth.authenticated || $auth.user?.role !== 'admin')) {
			const preferredTemplate = localStorage.getItem('preferredTemplate');
			if (
				preferredTemplate &&
				['minimal', 'modern', 'elegant', 'default'].includes(preferredTemplate)
			) {
				return preferredTemplate;
			}
		}

		return getFrontendTemplateName($config);
	}
);
