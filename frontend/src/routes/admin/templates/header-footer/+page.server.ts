import type { PageServerLoad } from './$types';
import { backendGet, parseBackendResponse } from '$lib/utils/backend-api';
import type { PageModuleData } from '$lib/types/page-builder';

type PackId = 'noir' | 'studio' | 'atelier';
type ByPackMap = Partial<Record<PackId, PageModuleData[]>>;
type StickyByPackMap = Partial<Record<PackId, boolean>>;
type RowTemplatesMap = Record<string, string>;
type RowTemplatesByPackMap = Partial<Record<PackId, RowTemplatesMap>>;

type SiteConfigPayload = {
	template?: {
		headerModules?: PageModuleData[];
		footerModules?: PageModuleData[];
		headerModulesByPack?: ByPackMap;
		footerModulesByPack?: ByPackMap;
		headerSticky?: boolean;
		headerStickyByPack?: StickyByPackMap;
		headerRowTemplates?: RowTemplatesMap;
		headerRowTemplatesByPack?: RowTemplatesByPackMap;
		footerRowTemplates?: RowTemplatesMap;
		footerRowTemplatesByPack?: RowTemplatesByPackMap;
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

function sanitizeStickyByPack(raw: unknown): StickyByPackMap {
	if (!raw || typeof raw !== 'object' || Array.isArray(raw)) return {};
	const out: StickyByPackMap = {};
	const src = raw as Record<string, unknown>;
	for (const pack of PACK_IDS) {
		const v = src[pack];
		if (typeof v === 'boolean') out[pack] = v;
	}
	return out;
}

function sanitizeRowTemplates(raw: unknown): RowTemplatesMap {
	if (!raw || typeof raw !== 'object' || Array.isArray(raw)) return {};
	const out: RowTemplatesMap = {};
	for (const [k, v] of Object.entries(raw as Record<string, unknown>)) {
		if (typeof v === 'string' && v.trim()) out[k] = v.trim();
	}
	return out;
}

function sanitizeRowTemplatesByPack(raw: unknown): RowTemplatesByPackMap {
	if (!raw || typeof raw !== 'object' || Array.isArray(raw)) return {};
	const out: RowTemplatesByPackMap = {};
	const src = raw as Record<string, unknown>;
	for (const pack of PACK_IDS) {
		if (Object.prototype.hasOwnProperty.call(src, pack)) {
			out[pack] = sanitizeRowTemplates(src[pack]);
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
			headerSticky: config.template?.headerSticky === true,
			headerStickyByPack: sanitizeStickyByPack(config.template?.headerStickyByPack),
			headerRowTemplates: sanitizeRowTemplates(config.template?.headerRowTemplates),
			headerRowTemplatesByPack: sanitizeRowTemplatesByPack(config.template?.headerRowTemplatesByPack),
			footerRowTemplates: sanitizeRowTemplates(config.template?.footerRowTemplates),
			footerRowTemplatesByPack: sanitizeRowTemplatesByPack(config.template?.footerRowTemplatesByPack),
			loadError: null as string | null
		};
	} catch (err) {
		return {
			headerModules: [] as PageModuleData[],
			footerModules: [] as PageModuleData[],
			headerModulesByPack: {} as ByPackMap,
			footerModulesByPack: {} as ByPackMap,
			headerSticky: false,
			headerStickyByPack: {} as StickyByPackMap,
			headerRowTemplates: {} as RowTemplatesMap,
			headerRowTemplatesByPack: {} as RowTemplatesByPackMap,
			footerRowTemplates: {} as RowTemplatesMap,
			footerRowTemplatesByPack: {} as RowTemplatesByPackMap,
			loadError: err instanceof Error ? err.message : 'Failed to load site config'
		};
	}
};
