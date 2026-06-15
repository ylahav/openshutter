<!-- frontend/src/lib/page-builder/modules/HeroModule.svelte -->
<script lang="ts">
	import Layout from './Hero/Layout.svelte';

	type HeroProps = Record<string, unknown>;

	type LegacyHeroProps = {
		config?: HeroProps;
	} & HeroProps;

	let {
		title = undefined,
		subtitle = undefined,
		description = undefined,
		buttonLabel = undefined,
		buttonUrl = undefined,
		button2Label = undefined,
		button2Url = undefined,
		ctaLabel = undefined,
		ctaUrl = undefined,
		backgroundImage = undefined,
		contentMediaOrder = undefined,
		mediaMaxCount = undefined,
		mediaSource = undefined,
		mediaImages = undefined,
		mediaArrangement = undefined,
		carouselIntervalMs = undefined,
		backgroundStyle = undefined,
		heroLayout = undefined,
		layoutVariant = undefined,
		heroImages = undefined,
		heroGalleryLeadingLimit = undefined,
		heroSplitLead = undefined,
		prefetchedGalleryLeadingUrls = undefined,
		slideshowIntervalMs = undefined,
		props,
		...rest
	}: {
		title?: unknown;
		subtitle?: unknown;
		description?: unknown;
		buttonLabel?: unknown;
		buttonUrl?: unknown;
		button2Label?: unknown;
		button2Url?: unknown;
		ctaLabel?: unknown;
		ctaUrl?: unknown;
		backgroundImage?: unknown;
		contentMediaOrder?: unknown;
		mediaMaxCount?: unknown;
		mediaSource?: unknown;
		mediaImages?: unknown;
		mediaArrangement?: unknown;
		carouselIntervalMs?: unknown;
		backgroundStyle?: unknown;
		heroLayout?: unknown;
		layoutVariant?: unknown;
		heroImages?: unknown;
		heroGalleryLeadingLimit?: unknown;
		heroSplitLead?: unknown;
		prefetchedGalleryLeadingUrls?: unknown;
		slideshowIntervalMs?: unknown;
		props?: LegacyHeroProps;
		[key: string]: unknown;
	} = $props();

	const config = $derived({
		...(props?.config && typeof props.config === 'object' ? props.config : {}),
		...(props && typeof props === 'object' ? props : {}),
		...rest,
		title,
		subtitle,
		description,
		buttonLabel,
		buttonUrl,
		button2Label,
		button2Url,
		ctaLabel,
		ctaUrl,
		backgroundImage,
		contentMediaOrder,
		mediaMaxCount,
		mediaSource,
		mediaImages,
		mediaArrangement,
		carouselIntervalMs,
		backgroundStyle,
		heroLayout,
		layoutVariant,
		heroImages,
		heroGalleryLeadingLimit,
		heroSplitLead,
		prefetchedGalleryLeadingUrls,
		slideshowIntervalMs
	} as HeroProps);
</script>

<Layout {config} />
