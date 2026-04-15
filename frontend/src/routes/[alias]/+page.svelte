<script lang="ts">
	import { currentLanguage } from '$stores/language';
	import { productName } from '$stores/siteConfig';
	import { MultiLangUtils } from '$lib/utils/multiLang';
	import PageRenderer from '$lib/page-builder/PageRenderer.svelte';
	import CmsPageTemplateSwitcher from '$lib/components/CmsPageTemplateSwitcher.svelte';
	import type { PageData, PageModuleData } from '$lib/types/page-builder';

	export let data: {
		page: PageData;
		modules: PageModuleData[];
	};

	$: pageData = data.page;
	$: modules = data.modules || [];
	$: hasModules = modules.length > 0;

	function getTextValue(value: string | { en?: string; he?: string } | undefined): string {
		if (!value) return '';
		if (typeof value === 'string') return value;
		return MultiLangUtils.getTextValue(value, $currentLanguage) || '';
	}
</script>

<svelte:head>
	<title>{getTextValue(pageData.title)} - {$productName}</title>
</svelte:head>

{#if hasModules}
	<PageRenderer page={pageData} modules={modules} />
{:else}
	<CmsPageTemplateSwitcher page={pageData} />
{/if}
