import type { PageLoad } from './$types';
import { logger } from '$lib/utils/logger';
import { getEffectivePageGrid, getEffectivePageModules } from '$lib/template/breakpoints';
import {
	buildTemplateAwareAliasCandidates,
	resolveSiteTemplatePack
} from '$lib/utils/template-page-alias';

const SITE_CONFIG_PAGE_VIEWPORT_PX = 1024;

export const load: PageLoad = async ({ fetch, parent }) => {
	// Ensure root/page server data is loaded first.
	await parent();

	let pageModules: any[] = [];
	let pageLayout: { gridRows?: number; gridColumns?: number } | null = null;
	let aliasPage: any = null;
	let aliasModules: any[] = [];

	try {
		const configRes = await fetch('/api/site-config');
		if (configRes.ok) {
			const configData = await configRes.json();
			const siteConfig = configData.success ? configData.data : configData;
			const pack = resolveSiteTemplatePack(siteConfig);

			const tmpl = siteConfig?.template;
			if (tmpl) {
				pageModules = getEffectivePageModules(tmpl, 'search', SITE_CONFIG_PAGE_VIEWPORT_PX) as any[];
				pageLayout = getEffectivePageGrid(tmpl, 'search', SITE_CONFIG_PAGE_VIEWPORT_PX);
			}

			// Prefer a real page alias for /search when it exists (e.g. studio: s-search).
			const aliasCandidates = buildTemplateAwareAliasCandidates('search', pack);
			for (const candidateAlias of aliasCandidates) {
				const pagesUrl = pack
					? `/api/pages/${candidateAlias}?pack=${encodeURIComponent(pack)}`
					: `/api/pages/${candidateAlias}`;
				const response = await fetch(pagesUrl);
				const result = await response.json().catch(() => null);
				if (!response.ok) {
					if (response.status === 404) continue;
					break;
				}
				const data = result?.success ? result.data : result;
				const page = data?.page ?? data;
				const modules = Array.isArray(data?.modules) ? data.modules : [];
				if (!page?.isPublished) continue;
				aliasPage = page;
				aliasModules = modules;
				break;
			}
		}
	} catch (err) {
		logger.error('[Search] Error fetching site config for pageModules:', err);
	}

	return {
		aliasPage,
		aliasModules,
		pageModules,
		pageLayout
	};
};

