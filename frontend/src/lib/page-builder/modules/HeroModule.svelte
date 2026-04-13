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
			backgroundImage
		}) satisfies HeroProps;
</script>

<Layout config={config} />
