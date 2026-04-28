import type { PageLoad } from './$types';
import { buildTemplateAwareAliasCandidates, resolveSiteTemplatePack } from '$lib/utils/template-page-alias';

export const load: PageLoad = async ({ url, fetch }) => {
	const alias = url.searchParams.get('alias');

	if (!alias) {
		return { page: null, modules: [], error: 'No page alias specified' };
	}

	try {
		const siteConfigRes = await fetch('/api/site-config');
		const siteConfigJson = siteConfigRes.ok ? await siteConfigRes.json().catch(() => null) : null;
		const siteConfig = siteConfigJson?.success ? siteConfigJson?.data : siteConfigJson;
		const pack = resolveSiteTemplatePack(siteConfig);
		const aliasCandidates = buildTemplateAwareAliasCandidates(alias, pack);

		for (const candidateAlias of aliasCandidates) {
			const pagesUrl = pack
				? `/api/pages/${candidateAlias}?pack=${encodeURIComponent(pack)}`
				: `/api/pages/${candidateAlias}`;
			const response = await fetch(pagesUrl);
			const result = await response.json().catch(() => null);

			if (!response.ok) {
				if (response.status === 404) continue;
				return {
					page: null,
					modules: [],
					error: result?.error || 'Page not found'
				};
			}

			const data = result?.success ? result.data : result;
			const page = data?.page ?? data;
			const modules = Array.isArray(data?.modules) ? data.modules : [];

			if (!page?.isPublished) {
				continue;
			}

			return { page, modules, error: null };
		}

		return { page: null, modules: [], error: 'Page not found' };
	} catch {
		return { page: null, modules: [], error: 'Failed to load page' };
	}
};
