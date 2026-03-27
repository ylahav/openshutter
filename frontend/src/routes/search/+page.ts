import type { PageLoad } from './$types';
import { logger } from '$lib/utils/logger';

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

			if (siteConfig?.template?.pageModules?.search) {
				pageModules = Array.isArray(siteConfig.template.pageModules.search)
					? siteConfig.template.pageModules.search
					: [];
			}

			if (siteConfig?.template?.pageLayout?.search) {
				pageLayout = siteConfig.template.pageLayout.search;
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

