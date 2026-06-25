import type { PageModuleData } from '$lib/types/page-builder';
import { normalizeTemplatePackId, type TemplatePackId } from '$lib/template-packs/ids';

/**
 * Cascade source for site-wide chrome arrays read from `site_config.template`.
 * Header and footer are resolved **independently**: a pack can override one and inherit the other.
 */
export interface ChromeCascadeSource {
	siteDefault?: PageModuleData[] | null;
	byPack?: Partial<Record<TemplatePackId, PageModuleData[] | null | undefined>> | null;
}

/**
 * Resolve a chrome array for a given active pack using the cascade:
 * 1. Pack override with at least one module wins.
 * 2. Otherwise fall back to `siteDefault` when it's an array.
 * 3. Otherwise empty array.
 *
 * An empty array `[]` or `null` value in `byPack[pack]` is treated as "inherit default" — authors
 * commonly override only one of header/footer and leave the other empty, expecting the default to fill in.
 */
export function resolveChromeForPack(
	source: ChromeCascadeSource | null | undefined,
	activePack: string | null | undefined
): PageModuleData[] {
	const pack = normalizeTemplatePackId(activePack);
	const byPack = source?.byPack;
	if (byPack && Object.prototype.hasOwnProperty.call(byPack, pack)) {
		const override = byPack[pack];
		if (Array.isArray(override) && override.length > 0) return override;
	}
	const siteDefault = source?.siteDefault;
	return Array.isArray(siteDefault) ? siteDefault : [];
}

/**
 * Resolve a scalar/object cascade where the pack value (if explicitly present) wins.
 * Treats `undefined` pack value as "inherit default". `null` pack value is **also** inherit
 * so callers can clear an override without distinguishing the two.
 */
function resolveScalarForPack<T>(
	siteDefault: T | undefined,
	byPack: Partial<Record<TemplatePackId, T | null | undefined>> | null | undefined,
	activePack: string | null | undefined
): T | undefined {
	const pack = normalizeTemplatePackId(activePack);
	if (byPack && Object.prototype.hasOwnProperty.call(byPack, pack)) {
		const v = byPack[pack];
		if (v !== undefined && v !== null) return v as T;
	}
	return siteDefault;
}

export interface ResolvedTemplateChrome {
	headerModules: PageModuleData[];
	footerModules: PageModuleData[];
	headerSticky: boolean;
	/** Per-row `grid-template-columns` map for the header (row index as string → template). */
	headerRowTemplates: Record<string, string>;
	/** Per-row `grid-template-columns` map for the footer. */
	footerRowTemplates: Record<string, string>;
}

/**
 * Convenience: read both header and footer cascades from a site-config-shaped object.
 * Accepts unknown input so callers can pass through loosely-typed site config blobs.
 */
export function resolveTemplateChrome(
	siteConfig: unknown,
	activePack: string | null | undefined
): ResolvedTemplateChrome {
	const template = (siteConfig as { template?: Record<string, unknown> } | null | undefined)?.template;
	const headerSticky =
		resolveScalarForPack<boolean>(
			typeof template?.headerSticky === 'boolean' ? (template.headerSticky as boolean) : undefined,
			asBooleanByPackMap(template?.headerStickyByPack),
			activePack
		) ?? false;
	const headerRowTemplates =
		resolveScalarForPack<Record<string, string>>(
			asRowTemplateMap(template?.headerRowTemplates),
			asRowTemplateByPackMap(template?.headerRowTemplatesByPack),
			activePack
		) ?? {};
	const footerRowTemplates =
		resolveScalarForPack<Record<string, string>>(
			asRowTemplateMap(template?.footerRowTemplates),
			asRowTemplateByPackMap(template?.footerRowTemplatesByPack),
			activePack
		) ?? {};
	return {
		headerModules: resolveChromeForPack(
			{
				siteDefault: asModuleArray(template?.headerModules),
				byPack: asByPackMap(template?.headerModulesByPack)
			},
			activePack
		),
		footerModules: resolveChromeForPack(
			{
				siteDefault: asModuleArray(template?.footerModules),
				byPack: asByPackMap(template?.footerModulesByPack)
			},
			activePack
		),
		headerSticky,
		headerRowTemplates,
		footerRowTemplates
	};
}

function asModuleArray(value: unknown): PageModuleData[] | null {
	return Array.isArray(value) ? (value as PageModuleData[]) : null;
}

function asByPackMap(
	value: unknown
): Partial<Record<TemplatePackId, PageModuleData[] | null | undefined>> | null {
	if (!value || typeof value !== 'object' || Array.isArray(value)) return null;
	return value as Partial<Record<TemplatePackId, PageModuleData[] | null | undefined>>;
}

function asRowTemplateMap(value: unknown): Record<string, string> | undefined {
	if (!value || typeof value !== 'object' || Array.isArray(value)) return undefined;
	const out: Record<string, string> = {};
	for (const [k, v] of Object.entries(value as Record<string, unknown>)) {
		if (typeof v !== 'string') continue;
		const trimmed = v.trim();
		if (trimmed) out[k] = trimmed;
	}
	return out;
}

function asRowTemplateByPackMap(
	value: unknown
): Partial<Record<TemplatePackId, Record<string, string>>> | null {
	if (!value || typeof value !== 'object' || Array.isArray(value)) return null;
	const out: Partial<Record<TemplatePackId, Record<string, string>>> = {};
	for (const [k, v] of Object.entries(value as Record<string, unknown>)) {
		const pack = normalizeTemplatePackId(k);
		const map = asRowTemplateMap(v);
		if (map !== undefined) out[pack] = map;
	}
	return out;
}

function asBooleanByPackMap(
	value: unknown
): Partial<Record<TemplatePackId, boolean | null | undefined>> | null {
	if (!value || typeof value !== 'object' || Array.isArray(value)) return null;
	const out: Partial<Record<TemplatePackId, boolean | null | undefined>> = {};
	for (const [k, v] of Object.entries(value as Record<string, unknown>)) {
		const pack = normalizeTemplatePackId(k);
		if (typeof v === 'boolean') out[pack] = v;
		else if (v === null) out[pack] = null;
	}
	return out;
}
