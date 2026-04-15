import { derived } from 'svelte/store';
import { siteConfigData } from '$stores/siteConfig';
import { auth } from '$lib/stores/auth';
import { page } from '$app/stores';
import type { SiteConfig } from '$lib/types/site-config';
import { normalizeTemplatePackId } from '$lib/template/packs/ids';

function getFrontendTemplateName(config: SiteConfig | null): string {
	const raw =
		config?.template?.frontendTemplate || config?.template?.activeTemplate || 'atelier';
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

		const configured = getFrontendTemplateName($config);
		const hasConfiguredTemplate =
			Boolean($config?.template?.frontendTemplate) || Boolean($config?.template?.activeTemplate);
		if (hasConfiguredTemplate) {
			return configured;
		}

		return configured;
	}
);
