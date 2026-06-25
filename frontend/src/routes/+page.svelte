<script lang="ts">
	import type { PageData } from './$types';
	import PageRenderer from '$lib/page-builder/PageRenderer.svelte';
	import { productName } from '$stores/siteConfig';
	import { t } from '$stores/i18n';
	import type { PageModuleData } from '$lib/types/page-builder';
	import type { PageData as BuilderPageData } from '$lib/types/page-builder';

	let { data }: { data: PageData } = $props();
const page = $derived((data.page ?? null) as BuilderPageData | null);
	const modules = $derived((data.modules ?? []) as PageModuleData[]);
	const headerModules = $derived(((data as { headerModules?: unknown }).headerModules ?? []) as PageModuleData[]);
	const footerModules = $derived(((data as { footerModules?: unknown }).footerModules ?? []) as PageModuleData[]);
const homePageStatus = $derived(data.homePageStatus ?? (page ? 'ok' : 'missing'));</script>

<svelte:head>
	<title>{$productName}</title>
</svelte:head>

{#if homePageStatus === 'unavailable'}
	<div
		class="min-h-screen flex flex-col items-center justify-center gap-2 px-6 text-center text-sm text-(--color-surface-700-300)"
	>
		<p class="font-medium text-(--color-surface-950-50)">{$t('siteHome.apiUnavailableTitle')}</p>
		<p class="max-w-md opacity-80">{$t('siteHome.apiUnavailableHint')}</p>
	</div>
{:else if page}
	<PageRenderer {page} {modules} {headerModules} {footerModules} />
{:else}
	<div class="min-h-screen flex items-center justify-center text-sm opacity-60">
		{$t('siteHome.pageNotFound')}
	</div>
{/if}
