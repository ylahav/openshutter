<script lang="ts">
	import { page } from '$app/stores';
	import { t } from '$stores/i18n';
	import { productName } from '$stores/siteConfig';
	import type { PageData } from './$types';
	import PageRenderer from '$lib/page-builder/PageRenderer.svelte';
	import AdvancedFilterSearch from '$lib/components/search/AdvancedFilterSearch.svelte';

	export let data: PageData;

	let initialQuery = $page.url.searchParams.get('q') || '';
	$: hasPageModules = data.pageModules && Array.isArray(data.pageModules) && data.pageModules.length > 0;
	$: pageLayout = data.pageLayout;
	$: pageForRenderer = hasPageModules
		? ({
				_id: 'search',
				title: {} as any,
				subtitle: {} as any,
				layout: pageLayout ? { gridRows: pageLayout.gridRows, gridColumns: pageLayout.gridColumns } : undefined
			} as any)
		: null;
</script>

<svelte:head>
	<title>{$t('search.title')} - {$productName}</title>
</svelte:head>

{#if hasPageModules}
	<PageRenderer page={pageForRenderer} modules={data.pageModules || []} />
{:else}
	<AdvancedFilterSearch {initialQuery} />
{/if}
