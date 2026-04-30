import { error } from '@sveltejs/kit';
import type { PageLoad } from './$types';
import { buildTemplateAwareAliasCandidates, resolveSiteTemplatePack } from '$lib/utils/template-page-alias';

export const load: PageLoad = async ({ fetch }) => {
	const pageAlias = 'contact';

	try {
		const siteConfigRes = await fetch('/api/site-config');
		const siteConfigJson = siteConfigRes.ok ? await siteConfigRes.json().catch(() => null) : null;
		const siteConfig = siteConfigJson?.success ? siteConfigJson?.data : siteConfigJson;
		const pack = resolveSiteTemplatePack(siteConfig);
		const aliasCandidates = buildTemplateAwareAliasCandidates(pageAlias, pack);

		for (const candidateAlias of aliasCandidates) {
			const pagesUrl = pack
				? `/api/pages/${candidateAlias}?pack=${encodeURIComponent(pack)}`
				: `/api/pages/${candidateAlias}`;
			const response = await fetch(pagesUrl);
			if (!response.ok) {
				if (response.status === 404) continue;
				throw error(500, 'Failed to load page');
			}
			const result = await response.json();
			const data = result.success ? result.data : result;

			if (!data.page && !data) {
				continue;
			}

			const pageData = data.page || data;
			const modulesData = data.modules || [];
			if (!pageData?.isPublished) {
				continue;
			}

			return {
				page: pageData,
				modules: Array.isArray(modulesData) ? modulesData : []
			};
		}
		throw error(404, 'Page not found');
	} catch (err) {
		if (err && typeof err === 'object' && 'status' in err) {
			throw err;
		}
		throw error(500, 'Failed to load page');
	}
};
