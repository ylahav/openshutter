import { normalizeTemplatePackId, type TemplatePackId } from '$lib/template/packs/ids';

/** Reading order / presence of the content vs media columns (packs style via `.hero[data-content-media-order="…"]`). */
export type HeroContentMediaOrder =
	| 'content-first'
	| 'media-first'
	| 'stacked'
	| 'content-only'
	| 'media-only';

export type HeroMediaSource = 'galleryLeading' | 'uploads';

export type HeroMediaArrangement = 'square' | 'masonry' | 'carousel';

/** @deprecated legacy split layout; owner site settings may still reference. */
export function normalizeHeroSplitLead(raw: unknown): 'media' | 'copy' {
	if (raw === undefined || raw === null) return 'media';
	const s = String(raw).trim().toLowerCase();
	if (s === 'copy' || s === 'text') return 'copy';
	return 'media';
}

export function normalizeHeroContentMediaOrder(raw: unknown): HeroContentMediaOrder {
	const s = String(raw ?? '').trim().toLowerCase().replace(/[\s_]+/g, '-');
	if (s === 'contentfirst' || s === 'content-first') return 'content-first';
	if (s === 'mediafirst' || s === 'media-first') return 'media-first';
	if (s === 'stacked' || s === 'vertical') return 'stacked';
	if (s === 'contentonly' || s === 'content-only') return 'content-only';
	if (s === 'mediaonly' || s === 'media-only') return 'media-only';
	return 'content-first';
}

export function normalizeHeroMediaSource(raw: unknown): HeroMediaSource {
	const s = String(raw ?? '').trim().toLowerCase();
	if (s === 'uploads' || s === 'upload' || s === 'manual' || s === 'urls') return 'uploads';
	return 'galleryLeading';
}

export function normalizeHeroMediaArrangement(raw: unknown): HeroMediaArrangement {
	const s = String(raw ?? '').trim().toLowerCase();
	if (s === 'masonry') return 'masonry';
	if (s === 'carousel' || s === 'slideshow') return 'carousel';
	return 'square';
}

export function parseUrlList(raw: unknown): string[] {
	if (Array.isArray(raw)) {
		return raw
			.filter((x): x is string => typeof x === 'string' && x.trim().length > 0)
			.map((x) => x.trim());
	}
	if (typeof raw === 'string') {
		return raw
			.split(/[\n,]+/)
			.map((x) => x.trim())
			.filter(Boolean);
	}
	return [];
}

function clampInt(n: number, min: number, max: number): number {
	if (!Number.isFinite(n)) return min;
	return Math.min(max, Math.max(min, Math.floor(n)));
}

/**
 * Max gallery-leading photos to request for the **media** region (not the background image).
 */
export function heroGalleryLeadingMediaLimit(cfg: Record<string, unknown>): number {
	const raw = Number(cfg.mediaMaxCount ?? cfg.heroGalleryLeadingLimit);
	if (Number.isFinite(raw) && raw >= 1) return clampInt(raw, 1, 12);
	return 4;
}

/** @deprecated legacy theme helper — v2 hero ignores template `hero.layout` for structure; kept for admin copy. */
export function defaultHeroLayoutForPack(pack: TemplatePackId): string {
	if (pack === 'noir') return 'fullbleed';
	if (pack === 'studio') return 'split';
	if (pack === 'atelier') return 'editorial';
	return 'stacked';
}

/**
 * Merge saved module props with legacy keys into a single v2-friendly config object
 * (Layout reads both new and legacy fields via this).
 */
export function normalizeHeroModuleConfig(raw: Record<string, unknown> | undefined): Record<string, unknown> {
	const c = raw && typeof raw === 'object' && !Array.isArray(raw) ? { ...raw } : {};

	let contentMediaOrder = normalizeHeroContentMediaOrder(c.contentMediaOrder);

	// Legacy: heroLayout + heroSplitLead
	if (c.contentMediaOrder === undefined && (c.heroLayout != null || c.layoutVariant != null)) {
		const legacy = String(c.heroLayout ?? c.layoutVariant ?? '')
			.trim()
			.toLowerCase();
		if (legacy === 'split') {
			const lead = String(c.heroSplitLead ?? 'media').toLowerCase();
			contentMediaOrder = lead === 'copy' || lead === 'text' ? 'content-first' : 'media-first';
		} else if (legacy === 'stacked' || legacy === 'editorial' || legacy === 'minimal' || legacy === 'portrait') {
			contentMediaOrder = 'stacked';
		} else {
			contentMediaOrder = 'content-first';
		}
	}

	const mediaSource = normalizeHeroMediaSource(
		c.mediaSource ??
			(String(c.backgroundStyle ?? '').toLowerCase() === 'galleryleading' ? 'galleryLeading' : 'uploads')
	);

	let mediaMaxCount = 4;
	const rawMax = c.mediaMaxCount ?? c.heroGalleryLeadingLimit;
	const parsedMax = Number(rawMax);
	if (Number.isFinite(parsedMax) && parsedMax >= 1) {
		mediaMaxCount = clampInt(parsedMax, 1, 12);
	}

	let mediaArrangement = normalizeHeroMediaArrangement(c.mediaArrangement);
	if (c.mediaArrangement === undefined && c.heroLayout != null) {
		const legacy = String(c.heroLayout).toLowerCase();
		if (legacy === 'slideshow') mediaArrangement = 'carousel';
		else if (legacy === 'mosaic') mediaArrangement = 'masonry';
	}

	const mediaImageUrls = (() => {
		const fromNew = parseUrlList(c.mediaImages);
		if (fromNew.length) return fromNew;
		return parseUrlList(c.heroImages);
	})();

	let backgroundImage =
		typeof c.backgroundImage === 'string' && c.backgroundImage.trim()
			? c.backgroundImage.trim()
			: undefined;

	// Optional second button: map legacy single CTA
	const buttonLabel = c.buttonLabel ?? c.ctaLabel;
	const buttonUrl = c.buttonUrl ?? c.ctaUrl;

	const mediaImagesStr =
		typeof c.mediaImages === 'string' && c.mediaImages.trim()
			? c.mediaImages
			: mediaImageUrls.length
				? mediaImageUrls.join('\n')
				: '';

	return {
		...c,
		contentMediaOrder,
		mediaSource,
		mediaMaxCount,
		mediaArrangement,
		...(mediaImagesStr ? { mediaImages: mediaImagesStr } : {}),
		buttonLabel,
		buttonUrl,
		...(backgroundImage ? { backgroundImage } : {})
	};
}

/** SSR / home loader: should we prefetch gallery-leading URLs for this hero? */
export function heroNeedsGalleryLeadingPrefetch(props: Record<string, unknown>): boolean {
	const n = normalizeHeroModuleConfig(props);
	return normalizeHeroMediaSource(n.mediaSource) === 'galleryLeading';
}

/**
 * @deprecated used by `+page.ts` — v2 uses `heroGalleryLeadingMediaLimit` + `heroNeedsGalleryLeadingPrefetch`.
 */
export function resolveHeroLayoutFromTemplateInputs(opts: {
	heroProps: Record<string, unknown> | undefined;
	templateHeroLayoutRaw: unknown;
	packId: string;
}): string {
	const pack = normalizeTemplatePackId(opts.packId) as TemplatePackId;
	const moduleHeroLayout = String(opts.heroProps?.heroLayout ?? opts.heroProps?.layoutVariant ?? '').trim();
	if (moduleHeroLayout) return moduleHeroLayout.toLowerCase();
	const themeHeroLayout = String(opts.templateHeroLayoutRaw ?? '').trim();
	if (themeHeroLayout) return themeHeroLayout.toLowerCase();
	return defaultHeroLayoutForPack(pack);
}

/** @deprecated */
export function galleryLeadingFetchLimit(_opts: {
	backgroundStyle: string;
	resolvedLayout: string;
	configLimit: unknown;
}): number {
	return 4;
}
