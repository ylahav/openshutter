<script lang="ts">
	// Template override for the Page Builder `hero` module.
	//
	// This component must accept the same props shape as the standard module because PageRenderer
	// spreads `{...module.props}` onto it.

	import Hero from '../Hero.svelte';

	export let title: string | Record<string, string> | undefined = undefined;
	export let subtitle: string | Record<string, string> | undefined = undefined;
	export let showCta: boolean | undefined = undefined;
	export let ctaLabel: string | Record<string, string> | undefined = undefined;
	export let ctaUrl: string | undefined = undefined;
	export let backgroundStyle: 'light' | 'dark' | 'image' | 'galleryLeading' | undefined = undefined;
	export let backgroundImage: string | undefined = undefined;
	// Some legacy payloads pass a `props` object.
	export let props: unknown = undefined;
</script>

<Hero />

