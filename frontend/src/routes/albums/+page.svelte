<script lang="ts">
	import type { PageData } from './$types';
	import { productName } from '$stores/siteConfig';
	import PageRenderer from '$lib/page-builder/PageRenderer.svelte';
	import type { PageModuleData } from '$lib/types/page-builder';
	import type { PageData as BuilderPageData } from '$lib/types/page-builder';

	let { data }: { data: PageData } = $props();

const page = $derived((data.page ?? null) as BuilderPageData | null);
	const modules = $derived((data.modules ?? []) as PageModuleData[]);
	const headerModules = $derived(((data as { headerModules?: unknown }).headerModules ?? []) as PageModuleData[]);
	const footerModules = $derived(((data as { footerModules?: unknown }).footerModules ?? []) as PageModuleData[]);
	const headerSticky = $derived((data as { headerSticky?: unknown }).headerSticky === true);
	const headerRowTemplates = $derived(
		(data as { headerRowTemplates?: Record<string, string> }).headerRowTemplates
	);
	const footerRowTemplates = $derived(
		(data as { footerRowTemplates?: Record<string, string> }).footerRowTemplates
	);
</script>

<svelte:head>
	<title>Albums - {$productName}</title>
</svelte:head>

{#if page}
	<PageRenderer
		{page}
		{modules}
		{headerModules}
		{footerModules}
		{headerSticky}
		{headerRowTemplates}
		{footerRowTemplates}
	/>
{:else}
	<div class="min-h-screen flex items-center justify-center text-sm opacity-60">Gallery page not found.</div>
{/if}
