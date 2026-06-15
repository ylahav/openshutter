import type { PageServerLoad } from './$types';
import { backendGet, parseBackendResponse } from '$lib/utils/backend-api';
import { SUPPORTED_LANGUAGES } from '$lib/types/multi-lang';

export const load: PageServerLoad = async ({ cookies, depends }) => {
	depends('admin:site-config');

	const defaultLanguages = SUPPORTED_LANGUAGES.map((lang) => ({
		code: lang.code,
		name: lang.name,
		flag: lang.flag || ''
	}));

	try {
		const [configRes, languagesRes] = await Promise.all([
			backendGet('/admin/site-config', { cookies }),
			backendGet('/admin/languages', { cookies }).catch(() => null)
		]);

		const siteConfig = await parseBackendResponse<Record<string, unknown>>(configRes);

		let availableLanguages = defaultLanguages;
		if (languagesRes?.ok) {
			const langResult = await parseBackendResponse<{ data?: unknown[] } | unknown[]>(languagesRes);
			const langs = Array.isArray(langResult)
				? langResult
				: Array.isArray(langResult?.data)
					? langResult.data
					: [];
			if (langs.length > 0) {
				availableLanguages = langs as typeof defaultLanguages;
			}
		}

		return {
			siteConfig,
			availableLanguages,
			loadError: null as string | null
		};
	} catch (err) {
		return {
			siteConfig: null,
			availableLanguages: defaultLanguages,
			loadError: err instanceof Error ? err.message : 'Failed to load site configuration'
		};
	}
};
