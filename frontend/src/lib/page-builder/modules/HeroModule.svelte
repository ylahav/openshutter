<!-- frontend/src/lib/page-builder/modules/HeroModule.svelte -->
<script lang="ts">
	import Layout from './Hero/Layout.svelte';

	type HeroProps = Record<string, unknown>;

	type LegacyHeroProps = {
		config?: HeroProps;
	} & HeroProps;

	export let title: unknown = undefined;
	export let subtitle: unknown = undefined;
	export let description: unknown = undefined;
	export let buttonLabel: unknown = undefined;
	export let buttonUrl: unknown = undefined;
	export let button2Label: unknown = undefined;
	export let button2Url: unknown = undefined;
	/** @deprecated maps to buttonLabel in Layout */
	export let ctaLabel: unknown = undefined;
	/** @deprecated maps to buttonUrl */
	export let ctaUrl: unknown = undefined;
	export let backgroundImage: unknown = undefined;
	export let contentMediaOrder: unknown = undefined;
	export let mediaMaxCount: unknown = undefined;
	export let mediaSource: unknown = undefined;
	export let mediaImages: unknown = undefined;
	export let mediaArrangement: unknown = undefined;
	export let carouselIntervalMs: unknown = undefined;
	/** @deprecated */
	export let backgroundStyle: unknown = undefined;
	export let heroLayout: unknown = undefined;
	export let layoutVariant: unknown = undefined;
	export let heroImages: unknown = undefined;
	export let heroGalleryLeadingLimit: unknown = undefined;
	export let heroSplitLead: unknown = undefined;
	export let prefetchedGalleryLeadingUrls: unknown = undefined;
	export let slideshowIntervalMs: unknown = undefined;

	export let props: LegacyHeroProps | undefined = undefined;

	$: config = {
		...(props?.config ?? (props && typeof props === 'object' ? props : {})),
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
	} as HeroProps;
</script>

<Layout {config} />
