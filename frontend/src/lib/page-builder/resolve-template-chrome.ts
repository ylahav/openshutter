import type { PageModuleData } from '$lib/types/page-builder';
import { normalizeTemplatePackId, type TemplatePackId } from '$lib/template-packs/ids';

/**
 * Cascade source for site-wide chrome arrays read from `site_config.template`.
 * `byPack` is intentionally a `Partial<Record<…>>` because a missing key means
 * "inherit default" while an empty-array value means "no chrome for this pack".
 */
export interface ChromeCascadeSource {
	siteDefault?: PageModuleData[] | null;
	byPack?: Partial<Record<TemplatePackId, PageModuleData[] | null | undefined>> | null;
}

/**
 * Resolve a chrome array for a given active pack using the cascade:
 * 1. Pack key present in `byPack` (even if `[]`) wins — `[]` means deliberate "no chrome for this pack".
 * 2. Otherwise fall back to `siteDefault` when it's an array.
 * 3. Otherwise empty array.
 *
 * A `null` value in `byPack[pack]` is treated the same as "key absent" (inherit default).
 */
export function resolveChromeForPack(
	source: ChromeCascadeSource | null | undefined,
	activePack: string | null | undefined
): PageModuleData[] {
	const pack = normalizeTemplatePackId(activePack);
	const byPack = source?.byPack;
	if (byPack && Object.prototype.hasOwnProperty.call(byPack, pack)) {
		const override = byPack[pack];
		if (Array.isArray(override)) return override;
		// `null` / `undefined` value with key present → treat as "inherit" (defensive; UI sends omit/`null` to revert).
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
