import type { PageLoad } from './$types';
import { resolveSiteTemplatePack } from '$lib/utils/template-page-alias';
import {
	fetchVisitorSiteConfig,
	resolveCmsPublishedPage
} from '$lib/utils/resolve-cms-page-load';
import { resolveTemplateChrome } from '$lib/page-builder/resolve-template-chrome';

export const load: PageLoad = async ({ url, fetch, parent }) => {
	const alias = url.searchParams.get('alias');

	if (!alias) {
		return { page: null, modules: [], headerModules: [], footerModules: [], error: 'No page alias specified' };
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
			return { page: null, modules: [], headerModules: [], footerModules: [], error: 'Page not found' };
		}

		const resolvedPage = (resolved.page ?? null) as { showHeader?: unknown; showFooter?: unknown } | null;
		const wantsHeader = resolvedPage?.showHeader === true;
		const wantsFooter = resolvedPage?.showFooter === true;
		const chrome =
			wantsHeader || wantsFooter
				? resolveTemplateChrome(siteConfig, packHint || 'atelier')
				: {
						headerModules: [],
						footerModules: [],
						headerSticky: false,
						headerRowTemplates: {} as Record<string, string>,
						footerRowTemplates: {} as Record<string, string>
					};

		return {
			page: resolved.page,
			modules: resolved.modules,
			headerModules: wantsHeader ? chrome.headerModules : [],
			footerModules: wantsFooter ? chrome.footerModules : [],
			headerSticky: wantsHeader ? chrome.headerSticky : false,
			headerRowTemplates: wantsHeader ? chrome.headerRowTemplates : undefined,
			footerRowTemplates: wantsFooter ? chrome.footerRowTemplates : undefined,
			error: null
		};
	} catch {
		return { page: null, modules: [], headerModules: [], footerModules: [], error: 'Failed to load page' };
	}
};
