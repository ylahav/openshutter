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
 * Convenience: read both header and footer cascades from a site-config-shaped object.
 * Accepts unknown input so callers can pass through loosely-typed site config blobs.
 */
export function resolveTemplateChrome(
	siteConfig: unknown,
	activePack: string | null | undefined
): { headerModules: PageModuleData[]; footerModules: PageModuleData[] } {
	const template = (siteConfig as { template?: Record<string, unknown> } | null | undefined)?.template;
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
		)
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
