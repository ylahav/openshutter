import type { PageServerLoad } from './$types';
import { backendGet, parseBackendResponse } from '$lib/utils/backend-api';
import type { PageModuleData } from '$lib/types/page-builder';

type PackId = 'noir' | 'studio' | 'atelier';
type ByPackMap = Partial<Record<PackId, PageModuleData[]>>;

type SiteConfigPayload = {
	template?: {
		headerModules?: PageModuleData[];
		footerModules?: PageModuleData[];
		headerModulesByPack?: ByPackMap;
		footerModulesByPack?: ByPackMap;
	};
};

const PACK_IDS: PackId[] = ['noir', 'studio', 'atelier'];

function sanitizeByPack(raw: unknown): ByPackMap {
	if (!raw || typeof raw !== 'object' || Array.isArray(raw)) return {};
	const out: ByPackMap = {};
	const src = raw as Record<string, unknown>;
	for (const pack of PACK_IDS) {
		// `[]` is preserved as a deliberate "no chrome for this pack" override (distinct from "inherit default").
		if (Object.prototype.hasOwnProperty.call(src, pack) && Array.isArray(src[pack])) {
			out[pack] = src[pack] as PageModuleData[];
		}
	}
	return out;
}

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
			headerModulesByPack: sanitizeByPack(config.template?.headerModulesByPack),
			footerModulesByPack: sanitizeByPack(config.template?.footerModulesByPack),
			loadError: null as string | null
		};
	} catch (err) {
		return {
			headerModules: [] as PageModuleData[],
			footerModules: [] as PageModuleData[],
			headerModulesByPack: {} as ByPackMap,
			footerModulesByPack: {} as ByPackMap,
			loadError: err instanceof Error ? err.message : 'Failed to load site config'
		};
	}
};
