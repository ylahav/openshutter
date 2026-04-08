import { derived } from 'svelte/store';
import { siteConfigData } from '$stores/siteConfig';
import { browser } from '$app/environment';
import { auth } from '$lib/stores/auth';
import { page } from '$app/stores';
import type { SiteConfig } from '$lib/types/site-config';
import { normalizeTemplatePackId } from '$lib/template-packs/registry';

function getFrontendTemplateName(config: SiteConfig | null): string {
	const raw =
		config?.template?.frontendTemplate || config?.template?.activeTemplate || 'noir';
	return normalizeTemplatePackId(raw);
}

/**
 * Resolved visitor template pack id for **public** routes only.
 * On `/admin`, returns `'noir'` — admin uses a fixed shell (see `AdminAppChrome`);
 * this store value must not drive admin styling.
 */
export const activeTemplate = derived(
	[siteConfigData, auth, page],
	([$config, $auth, $page]) => {
		if ($page.url.pathname.startsWith('/admin')) {
			return 'noir';
		}

		if (browser && (!$auth.authenticated || $auth.user?.role !== 'admin')) {
			const preferredTemplate = localStorage.getItem('preferredTemplate');
			if (
				preferredTemplate &&
				['noir', 'studio', 'atelier', 'default', 'minimal', 'simple', 'modern', 'elegant'].includes(
					preferredTemplate
				)
			) {
				return normalizeTemplatePackId(preferredTemplate);
			}
		}

		return getFrontendTemplateName($config);
	}
);
