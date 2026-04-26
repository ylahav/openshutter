import { normalizeTemplatePackId, type TemplatePackId } from '$lib/template/packs/ids';

/** Canonical hero layout slugs (theme `template.hero.layout` + module `heroLayout`). */
export type HeroLayoutSlug =
	| 'fullbleed'
	| 'split'
	| 'editorial'
	| 'stacked'
	| 'mosaic'
	| 'filmstrip'
	| 'minimal'
	| 'portrait'
	| 'slideshow';

const CANONICAL: Record<string, HeroLayoutSlug> = {
	fullbleed: 'fullbleed',
	split: 'split',
	editorial: 'editorial',
	stacked: 'stacked',
	mosaic: 'mosaic',
	filmstrip: 'filmstrip',
	minimal: 'minimal',
	portrait: 'portrait',
	slideshow: 'slideshow'
};

/** Accepts legacy module keys (e.g. layoutVariant / camelCase). */
export function normalizeHeroLayout(raw: unknown): HeroLayoutSlug | null {
	if (raw === undefined || raw === null) return null;
	const s = String(raw).trim();
	if (!s) return null;
	const compact = s.toLowerCase().replace(/[\s_-]+/g, '');
	if (compact in CANONICAL) return CANONICAL[compact];
	// legacy: fullBleed → fullbleed
	const deCamel = s.replace(/([A-Z])/g, '-$1').toLowerCase().replace(/[\s_-]+/g, '');
	if (deCamel in CANONICAL) return CANONICAL[deCamel];
	if (compact === 'typographic' || compact === 'minimaltypographic') return 'minimal';
	if (compact === 'fullviewport') return 'fullbleed';
	return null;
}

/** Split row: image column first vs copy column first (visual order). */
export type HeroSplitLead = 'media' | 'copy';

export function normalizeHeroSplitLead(raw: unknown): HeroSplitLead {
	if (raw === undefined || raw === null) return 'media';
	const s = String(raw).trim().toLowerCase();
	if (s === 'copy' || s === 'text') return 'copy';
	return 'media';
}

export function defaultHeroLayoutForPack(pack: TemplatePackId): HeroLayoutSlug {
	if (pack === 'noir') return 'fullbleed';
	if (pack === 'studio') return 'split';
	if (pack === 'atelier') return 'editorial';
	return 'stacked';
}

/** Same resolution as Hero `Layout.svelte` (module + theme + pack default). */
export function resolveHeroLayoutFromTemplateInputs(opts: {
	heroProps: Record<string, unknown> | undefined;
	templateHeroLayoutRaw: unknown;
	packId: string;
}): HeroLayoutSlug {
	const pack = normalizeTemplatePackId(opts.packId) as TemplatePackId;
	const themeHeroLayout = normalizeHeroLayout(opts.templateHeroLayoutRaw);
	const moduleHeroLayout = normalizeHeroLayout(
		opts.heroProps?.heroLayout ?? opts.heroProps?.layoutVariant
	);
	return moduleHeroLayout ?? themeHeroLayout ?? defaultHeroLayoutForPack(pack);
}

/**
 * How many gallery-leading photos to request. For **`galleryLeading`** background, imagery comes
 * only from this API (manual `heroImages` are ignored). Mosaic / slideshow request a higher limit;
 * other layouts use 1.
 */
export function galleryLeadingFetchLimit(opts: {
	backgroundStyle: string;
	resolvedLayout: HeroLayoutSlug;
	configLimit: unknown;
}): number {
	if (opts.backgroundStyle !== 'galleryLeading') return 0;
	const useMulti = opts.resolvedLayout === 'mosaic' || opts.resolvedLayout === 'slideshow';
	if (!useMulti) return 1;
	const raw = Number(opts.configLimit);
	if (Number.isFinite(raw) && raw >= 2) return Math.min(12, Math.floor(raw));
	return opts.resolvedLayout === 'slideshow' ? 5 : 4;
}

export function parseHeroImageList(config: Record<string, unknown> | undefined): string[] {
	if (!config) return [];
	const raw = config.heroImages ?? config.slideshowImages ?? config.mosaicImages;
	if (Array.isArray(raw)) {
		return raw
			.filter((x): x is string => typeof x === 'string' && x.trim().length > 0)
			.map((x) => x.trim());
	}
	if (typeof raw === 'string') {
		return raw
			.split(/[\n,]+/)
			.map((s) => s.trim())
			.filter(Boolean);
	}
	return [];
}

export function parseHeroStats(
	config: Record<string, unknown> | undefined
): { label: string; value: string }[] {
	const raw = config?.heroStats;
	if (!Array.isArray(raw)) return [];
	return raw
		.filter((r) => r && typeof r === 'object')
		.map((r) => {
			const o = r as Record<string, unknown>;
			return {
				label: String(o.label ?? ''),
				value: String(o.value ?? '')
			};
		})
		.filter((s) => s.label || s.value);
}
