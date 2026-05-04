import type { PageLoad } from './$types';
import { resolveSiteTemplatePack } from '$lib/utils/template-page-alias';
import {
	fetchVisitorSiteConfig,
	resolveCmsPublishedPage
} from '$lib/utils/resolve-cms-page-load';

export const load: PageLoad = async ({ url, fetch, parent }) => {
	const alias = url.searchParams.get('alias');

	if (!alias) {
		return { page: null, modules: [], error: 'No page alias specified' };
	}

	try {
		const parentData = await parent();
		const siteConfig =
			parentData.visitorSiteConfig !== undefined && parentData.visitorSiteConfig !== null
				? parentData.visitorSiteConfig
				: await fetchVisitorSiteConfig(fetch);
		const packHint =
			typeof parentData.visitorTemplatePack === 'string' && parentData.visitorTemplatePack.trim()
				? parentData.visitorTemplatePack.trim()
				: resolveSiteTemplatePack(siteConfig);

		const resolved = await resolveCmsPublishedPage(fetch, {
			baseAlias: alias,
			siteConfig,
			packHint,
			extraRequests: []
		});

		if (!resolved) {
			return { page: null, modules: [], error: 'Page not found' };
		}

		return { page: resolved.page, modules: resolved.modules, error: null };
	} catch {
		return { page: null, modules: [], error: 'Failed to load page' };
	}
};
