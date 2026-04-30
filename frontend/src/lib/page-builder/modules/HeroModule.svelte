<!-- frontend/src/lib/page-builder/modules/HeroModule.svelte -->
<script lang="ts">
	import Layout from './Hero/Layout.svelte';

	type HeroProps = {
		title?: string | Record<string, string>;
		subtitle?: string | Record<string, string>;
		showCta?: boolean;
		ctaLabel?: string | Record<string, string>;
		ctaUrl?: string;
		backgroundStyle?: 'light' | 'dark' | 'image' | 'galleryLeading';
		backgroundImage?: string;
		/** `contain` | `cover`; unset uses pack default (Noir + image → cover). */
		imageFit?: 'contain' | 'cover';
		/** Noir full-viewport image hero unless `false`. Other packs need `true`. */
		fullViewportHero?: boolean;
		showHeroRule?: boolean;
		showScrollHint?: boolean;
		scrollHintHref?: string;
		scrollHintLabel?: string | Record<string, string>;
		/** Layout slug; overrides `template.hero.layout` when set. */
		heroLayout?: string;
		/** @deprecated use `heroLayout` */
		layoutVariant?: string;
		heroImages?: string | string[];
		/** When background is galleryLeading and layout is mosaic/slideshow with no heroImages: API limit (2–12). */
		heroGalleryLeadingLimit?: number | string;
		/** Split layout: CSS `grid-template-columns` (e.g. `1fr 1fr`, `minmax(0,3fr) minmax(0,2fr)`). */
		heroSplitGridColumns?: string;
		/** Split layout: CSS min-height for the split row. */
		heroSplitMinHeight?: string;
		/** Split layout: CSS min-height for the image column. */
		heroSplitMediaMinHeight?: string;
		/** Split layout: `copy` = text column first in reading order (LTR). Default / omitted = image first. */
		heroSplitLead?: 'media' | 'copy';
		/** Set by home load: SSR-fetched URLs so gallery-leading heroes paint before client fetch. */
		prefetchedGalleryLeadingUrls?: string[];
		slideshowIntervalMs?: number | string;
		filmstripMeta?: string;
		heroStats?: { label?: string; value?: string }[];
	};

	type LegacyHeroProps = {
		config?: HeroProps;
	} & HeroProps;

	// PageRenderer passes flat props via {...module.props}
	export let title: HeroProps['title'] = undefined;
	export let subtitle: HeroProps['subtitle'] = undefined;
	export let showCta: HeroProps['showCta'] = undefined;
	export let ctaLabel: HeroProps['ctaLabel'] = undefined;
	export let ctaUrl: HeroProps['ctaUrl'] = undefined;
	export let backgroundStyle: NonNullable<HeroProps['backgroundStyle']> = 'light';
	export let backgroundImage: HeroProps['backgroundImage'] = undefined;
	export let imageFit: HeroProps['imageFit'] = undefined;
	export let fullViewportHero: HeroProps['fullViewportHero'] = undefined;
	export let showHeroRule: HeroProps['showHeroRule'] = undefined;
	export let showScrollHint: HeroProps['showScrollHint'] = undefined;
	export let scrollHintHref: HeroProps['scrollHintHref'] = undefined;
	export let scrollHintLabel: HeroProps['scrollHintLabel'] = undefined;
	export let heroLayout: HeroProps['heroLayout'] = undefined;
	export let layoutVariant: HeroProps['layoutVariant'] = undefined;
	export let heroImages: HeroProps['heroImages'] = undefined;
	export let heroGalleryLeadingLimit: HeroProps['heroGalleryLeadingLimit'] = undefined;
	export let heroSplitGridColumns: HeroProps['heroSplitGridColumns'] = undefined;
	export let heroSplitMinHeight: HeroProps['heroSplitMinHeight'] = undefined;
	export let heroSplitMediaMinHeight: HeroProps['heroSplitMediaMinHeight'] = undefined;
	export let heroSplitLead: HeroProps['heroSplitLead'] = undefined;
	export let prefetchedGalleryLeadingUrls: HeroProps['prefetchedGalleryLeadingUrls'] = undefined;
	export let slideshowIntervalMs: HeroProps['slideshowIntervalMs'] = undefined;
	export let filmstripMeta: HeroProps['filmstripMeta'] = undefined;
	export let heroStats: HeroProps['heroStats'] = undefined;

	// Temporary migration fallback for legacy nested props.config payloads
	export let props: LegacyHeroProps | undefined = undefined;
	$: config = (props?.config ??
		(props && typeof props === 'object' ? props : undefined) ?? {
			title,
			subtitle,
			showCta,
			ctaLabel,
			ctaUrl,
			backgroundStyle,
			backgroundImage,
			imageFit,
			fullViewportHero,
			showHeroRule,
			showScrollHint,
			scrollHintHref,
			scrollHintLabel,
			heroLayout,
			layoutVariant,
			heroImages,
			heroGalleryLeadingLimit,
			heroSplitGridColumns,
			heroSplitMinHeight,
			heroSplitMediaMinHeight,
			heroSplitLead,
			prefetchedGalleryLeadingUrls,
			slideshowIntervalMs,
			filmstripMeta,
			heroStats
		}) satisfies HeroProps;
</script>

<Layout {config} />
