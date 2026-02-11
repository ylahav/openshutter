<!-- frontend/src/lib/page-builder/modules/HeroModule.svelte -->
<script lang="ts">
	import Layout from './Hero/Layout.svelte';

	// PageRenderer passes {...module.props} so we receive individual props
	export let title: string | Record<string, string> | undefined;
	export let subtitle: string | Record<string, string> | undefined;
	export let ctaLabel: string | Record<string, string> | undefined;
	export let ctaUrl: string | undefined;
	export let backgroundStyle: 'light' | 'dark' | 'image' | 'galleryLeading' = 'light';
	export let backgroundImage: string | undefined;

	// Support legacy: props or props.config; otherwise use individual props from spread
	export let props: any = undefined;
	$: config = props?.config ?? (props && typeof props === 'object' ? props : null) ?? {
		title, subtitle, ctaLabel, ctaUrl, backgroundStyle, backgroundImage
	};
	const data = null;
	const templateConfig = {};
</script>

<Layout config={config} {data} {templateConfig} />
