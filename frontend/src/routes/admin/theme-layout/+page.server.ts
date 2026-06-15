import type { PageServerLoad } from './$types';
import { backendGet, parseBackendResponse } from '$lib/utils/backend-api';

export const load: PageServerLoad = async ({ cookies, depends }) => {
	depends('admin:theme-layout');

	try {
		const [cfgRes, tplRes] = await Promise.all([
			backendGet('/admin/site-config', { cookies }),
			backendGet('/admin/templates', { cookies })
		]);

		const siteConfig = await parseBackendResponse<Record<string, unknown>>(cfgRes);
		let templatesList: unknown[] = [];
		if (tplRes.ok) {
			const tplResult = await parseBackendResponse<unknown[] | { data?: unknown[] }>(tplRes);
			templatesList = Array.isArray(tplResult)
				? tplResult
				: Array.isArray(tplResult?.data)
					? tplResult.data
					: [];
		}

		return {
			siteConfig,
			templatesList,
			loadError: null as string | null
		};
	} catch (err) {
		return {
			siteConfig: null,
			templatesList: [] as unknown[],
			loadError: err instanceof Error ? err.message : 'Failed to load template configuration'
		};
	}
};
