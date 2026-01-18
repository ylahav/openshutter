<script lang="ts">
	import { currentLanguage } from '$stores/language';
	import { MultiLangUtils } from '$lib/utils/multiLang';
	import PageRenderer from '$lib/page-builder/PageRenderer.svelte';
	import type { PageData, PageModuleData } from '$lib/types/page-builder';

	export let data: {
		page: PageData | null;
		modules: PageModuleData[];
	};

	$: titleText = data?.page?.title
		? MultiLangUtils.getTextValue(data.page.title, $currentLanguage)
		: '';
	$: descriptionText = data?.page?.subtitle
		? MultiLangUtils.getTextValue(data.page.subtitle, $currentLanguage)
		: '';
</script>

<svelte:head>
	<title>{titleText || 'Page'}</title>
	{#if descriptionText}
		<meta name="description" content={descriptionText} />
	{/if}
</svelte:head>

<PageRenderer page={data.page} modules={data.modules} />
