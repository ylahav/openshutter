<script lang="ts">
	import { page } from '$app/stores';
	import { t } from '$stores/i18n';
	import { productName, siteConfigData } from '$stores/siteConfig';
	import { viewportWidth } from '$lib/stores/viewport';
	import { getEffectivePageGrid, getEffectivePageModules } from '$lib/template/breakpoints';
	import type { PageData } from './$types';
	import PageRenderer from '$lib/page-builder/PageRenderer.svelte';
	import SearchTemplateSwitcher from '$lib/components/SearchTemplateSwitcher.svelte';
	import type { PageModuleData } from '$lib/types/page-builder';
	import { activeTemplate } from '$stores/template';

	export let data: PageData;

	$: searchUiVariant = ($activeTemplate === 'noir' ? 'noir' : 'default') as 'noir' | 'default';

	$: initialQuery = $page.url.searchParams.get('q') || '';

	$: searchTemplate =
		$siteConfigData?.template ??
		(data.pageModules?.length || data.pageLayout
			? {
					pageModules: data.pageModules?.length ? { search: data.pageModules } : undefined,
					pageLayout: data.pageLayout ? { search: data.pageLayout } : undefined
				}
			: undefined);

	$: searchModules = (searchTemplate
		? getEffectivePageModules(searchTemplate, 'search', $viewportWidth)
		: []) as PageModuleData[];
	$: searchLayout = searchTemplate
		? getEffectivePageGrid(searchTemplate, 'search', $viewportWidth)
		: { gridRows: 1, gridColumns: 1 };

	$: hasPageModules = Array.isArray(searchModules) && searchModules.length > 0;
	$: pageForRenderer = hasPageModules
		? ({
				_id: 'search',
				title: {} as any,
				subtitle: {} as any,
				layout: { gridRows: searchLayout.gridRows, gridColumns: searchLayout.gridColumns }
			} as any)
		: null;
</script>

<svelte:head>
	<title>{$t('search.title')} - {$productName}</title>
</svelte:head>

{#if hasPageModules}
	<PageRenderer page={pageForRenderer as any} modules={searchModules} />
{:else}
	<SearchTemplateSwitcher {initialQuery} variant={searchUiVariant} />
{/if}
