<script lang="ts">
	import { currentLanguage } from '$stores/language';
	import { MultiLangUtils } from '$lib/utils/multiLang';
	import PageRenderer from '$lib/page-builder/PageRenderer.svelte';
	import type { PageData, PageModuleData } from '$lib/types/page-builder';

	export let data: {
		page: PageData;
		modules: PageModuleData[];
	};

	$: pageData = data.page;
	$: modules = data.modules || [];

	function getTextValue(value: string | { en?: string; he?: string } | undefined): string {
		if (!value) return '';
		if (typeof value === 'string') return value;
		return MultiLangUtils.getTextValue(value, $currentLanguage) || '';
	}
</script>

<svelte:head>
	<title>{getTextValue(pageData.title)} - OpenShutter</title>
</svelte:head>

<PageRenderer page={pageData} modules={modules} />
