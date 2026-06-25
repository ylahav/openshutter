import type { PageLoad } from './$types';
import { logger } from '$lib/utils/logger';
import { getConfiguredPackId } from '$lib/template-packs/resolve-visitor-pack';
import { resolveTemplateChrome } from '$lib/page-builder/resolve-template-chrome';

export const load: PageLoad = async ({ fetch, parent }) => {
	const { visitorTemplatePack, visitorSiteConfig } = await parent();
	const pack =
		typeof visitorTemplatePack === 'string' ? visitorTemplatePack : getConfiguredPackId(visitorSiteConfig);

	try {
		const response = await fetch(`/api/pages/gallery?role=gallery&pack=${encodeURIComponent(pack)}`);
		if (!response.ok) {
			logger.error('[Gallery] Failed to fetch DB gallery page:', response.status, response.statusText);
			return { page: null, modules: [], headerModules: [], footerModules: [] };
		}

		const result = await response.json();
		const payload = result?.success ? result?.data : result;
		const page = payload?.page ?? payload ?? null;
		const modules = Array.isArray(payload?.modules) ? payload.modules : [];

		const wantsHeader = (page as { showHeader?: unknown } | null)?.showHeader === true;
		const wantsFooter = (page as { showFooter?: unknown } | null)?.showFooter === true;
		const chrome =
			wantsHeader || wantsFooter
				? resolveTemplateChrome(visitorSiteConfig, pack)
				: {
						headerModules: [],
						footerModules: [],
						headerSticky: false,
						headerRowTemplates: {} as Record<string, string>,
						footerRowTemplates: {} as Record<string, string>
					};

		return {
			page,
			modules,
			headerModules: wantsHeader ? chrome.headerModules : [],
			footerModules: wantsFooter ? chrome.footerModules : [],
			headerSticky: wantsHeader ? chrome.headerSticky : false,
			headerRowTemplates: wantsHeader ? chrome.headerRowTemplates : undefined,
			footerRowTemplates: wantsFooter ? chrome.footerRowTemplates : undefined
		};
	} catch (err) {
		logger.error('[Gallery] Error fetching DB gallery page:', err);
		return { page: null, modules: [], headerModules: [], footerModules: [] };
	}
};
