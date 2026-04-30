<script lang="ts">
	import type { PageData } from './$types';
	import PageRenderer from '$lib/page-builder/PageRenderer.svelte';
	import { productName } from '$stores/siteConfig';
	import type { PageModuleData } from '$lib/types/page-builder';
	import type { PageData as BuilderPageData } from '$lib/types/page-builder';

	export let data: PageData;
	$: page = (data.page ?? null) as BuilderPageData | null;
	$: modules = (data.modules ?? []) as PageModuleData[];
</script>

<svelte:head>
	<title>{$productName}</title>
</svelte:head>

{#if page}
	<PageRenderer {page} {modules} />
{:else}
	<div class="min-h-screen flex items-center justify-center text-sm opacity-60">Home page not found.</div>
{/if}
