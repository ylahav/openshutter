import type { PageLoad } from './$types';
import { logger } from '$lib/utils/logger';
import { getEffectivePageGrid, getEffectivePageModules } from '$lib/template/breakpoints';

const SITE_CONFIG_PAGE_VIEWPORT_PX = 1024;

export const load: PageLoad = async ({ fetch, parent }) => {
	// Ensure root/page server data is loaded first.
	await parent();

	let pageModules: any[] = [];
	let pageLayout: { gridRows?: number; gridColumns?: number } | null = null;

	try {
		const configRes = await fetch('/api/site-config');
		if (configRes.ok) {
			const configData = await configRes.json();
			const siteConfig = configData.success ? configData.data : configData;

			const tmpl = siteConfig?.template;
			if (tmpl) {
				pageModules = getEffectivePageModules(tmpl, 'search', SITE_CONFIG_PAGE_VIEWPORT_PX) as any[];
				pageLayout = getEffectivePageGrid(tmpl, 'search', SITE_CONFIG_PAGE_VIEWPORT_PX);
			}
		}
	} catch (err) {
		logger.error('[Search] Error fetching site config for pageModules:', err);
	}

	return {
		pageModules,
		pageLayout
	};
};

