import type { PageServerLoad } from './$types';
import { backendGet, parseBackendResponse } from '$lib/utils/backend-api';
import type { PageModuleData } from '$lib/types/page-builder';

type SiteConfigPayload = {
	template?: {
		headerModules?: PageModuleData[];
		footerModules?: PageModuleData[];
	};
};

export const load: PageServerLoad = async ({ cookies, depends }) => {
	depends('admin:site-config:header-footer');

	try {
		const response = await backendGet('/admin/site-config', { cookies });
		const config = (await parseBackendResponse<SiteConfigPayload>(response)) ?? {};
		const headerModules = Array.isArray(config.template?.headerModules)
			? (config.template!.headerModules as PageModuleData[])
			: [];
		const footerModules = Array.isArray(config.template?.footerModules)
			? (config.template!.footerModules as PageModuleData[])
			: [];
		return {
			headerModules,
			footerModules,
			loadError: null as string | null
		};
	} catch (err) {
		return {
			headerModules: [] as PageModuleData[],
			footerModules: [] as PageModuleData[],
			loadError: err instanceof Error ? err.message : 'Failed to load site config'
		};
	}
};
