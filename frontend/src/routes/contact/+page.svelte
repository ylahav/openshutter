<script lang="ts">
	import { currentLanguage } from '$stores/language';
	import { MultiLangUtils } from '$lib/utils/multiLang';
	import PageRenderer from '$lib/page-builder/PageRenderer.svelte';
	import ContactTemplateSwitcher from '$lib/components/ContactTemplateSwitcher.svelte';
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
	$: hasModules = Array.isArray(data.modules) && data.modules.length > 0;
</script>

<svelte:head>
	<title>{titleText || 'Contact'}</title>
	{#if descriptionText}
		<meta name="description" content={descriptionText} />
	{/if}
</svelte:head>

{#if hasModules}
	<PageRenderer page={data.page} modules={data.modules} />
{:else}
	<ContactTemplateSwitcher page={data.page} />
{/if}
