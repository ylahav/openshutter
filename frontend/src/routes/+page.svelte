<script lang="ts">
	import type { PageData } from './$types';
	import HomeTemplateSwitcher from '$components/HomeTemplateSwitcher.svelte';
	import PageRenderer from '$lib/page-builder/PageRenderer.svelte';
	import { siteConfigData } from '$stores/siteConfig';

	export let data: PageData;

	import { logger } from '$lib/utils/logger';
	
	// Check if we have pageModules for home - if so, use PageRenderer instead of template switcher
	$: hasPageModules = data.pageModules && Array.isArray(data.pageModules) && data.pageModules.length > 0;
	$: pageLayout = data.pageLayout;
	
	// Debug logging
	$: if (data.pageModules !== undefined) {
		logger.debug('[Home] Page modules check:', {
			hasPageModules,
			pageModulesCount: data.pageModules?.length || 0,
			pageModules: data.pageModules,
			pageLayout
		});
	}
	
	// Create a page object for PageRenderer
	// Don't automatically pull title/subtitle from siteConfig - let page modules control the content
	$: pageForRenderer = hasPageModules ? {
		_id: 'home',
		// Only set title/subtitle if explicitly defined in page data (not from siteConfig)
		title: undefined,
		subtitle: undefined,
		layout: pageLayout ? { gridRows: pageLayout.gridRows, gridColumns: pageLayout.gridColumns } : undefined
	} : null;
</script>

<svelte:head>
	<title>OpenShutter</title>
</svelte:head>

{#if hasPageModules}
	<!-- Use PageRenderer when pageModules are configured -->
	<PageRenderer page={pageForRenderer} modules={data.pageModules || []} />
{:else}
	<!-- Fallback to template switcher for legacy templates -->
	<HomeTemplateSwitcher {data} />
{/if}
