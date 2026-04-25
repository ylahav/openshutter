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
			scrollHintLabel
		}) satisfies HeroProps;
</script>

<Layout config={config} />
