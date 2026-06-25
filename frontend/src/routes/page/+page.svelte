<script lang="ts">
	import { page } from '$app/stores';
	import PageRenderer from '$lib/page-builder/PageRenderer.svelte';
	import CmsPageTemplateSwitcher from '$lib/components/CmsPageTemplateSwitcher.svelte';
	import { MultiLangUtils } from '$lib/utils/multiLang';
	import { currentLanguage } from '$stores/language';
	import { productName } from '$stores/siteConfig';
	import type { PageData, PageModuleData } from '$lib/types/page-builder';

	let { data }: { data: {
		page: PageData | null;
		modules: PageModuleData[];
		headerModules?: PageModuleData[];
		footerModules?: PageModuleData[];
		error: string | null;
	} } = $props();

const pageData = $derived(data.page);
	const modules = $derived(data.modules || []);
	const headerModules = $derived(((data as { headerModules?: unknown }).headerModules ?? []) as PageModuleData[]);
	const footerModules = $derived(((data as { footerModules?: unknown }).footerModules ?? []) as PageModuleData[]);
const loadError = $derived(data.error);
	const hasError = $derived(!!loadError || !pageData);
const hasModules = $derived(modules.length > 0);

	function getTextValue(value: string | { en?: string; he?: string } | undefined): string {
		if (!value) return '';
		if (typeof value === 'string') return value;
		return MultiLangUtils.getTextValue(value, $currentLanguage) || '';
	}
</script>

<svelte:head>
	<title>{pageData ? getTextValue(pageData.title) : 'Page'} - {$productName}</title>
</svelte:head>

<div class="min-h-screen flex flex-col">
	{#if hasError}
		<div class="flex-1">
			<CmsPageTemplateSwitcher page={pageData} error={loadError || 'Page not found'} />
		</div>
	{:else if hasModules}
		<PageRenderer page={pageData} modules={modules} {headerModules} {footerModules} />
	{:else}
		<CmsPageTemplateSwitcher page={pageData} />
	{/if}
</div>
