<script lang="ts">
	import type { PageData } from './$types';
	import HomeTemplateSwitcher from '$components/HomeTemplateSwitcher.svelte';
	import PageRenderer from '$lib/page-builder/PageRenderer.svelte';
	import { siteConfigData, productName } from '$stores/siteConfig';
	import { viewportWidth } from '$lib/stores/viewport';
	import { getEffectivePageGrid, getEffectivePageModules } from '$lib/template/breakpoints';
	import type { PageModuleData } from '$lib/types/page-builder';

	export let data: PageData;

	import { logger } from '$lib/utils/logger';

	/** Full template from store when loaded; else minimal shape from SSR `load()` for first paint. */
	$: homeTemplate =
		$siteConfigData?.template ??
		(data.pageModules?.length || data.pageLayout
			? {
					pageModules: data.pageModules?.length ? { home: data.pageModules } : undefined,
					pageLayout: data.pageLayout ? { home: data.pageLayout } : undefined
				}
			: undefined);

	$: homeModules = (homeTemplate
		? getEffectivePageModules(homeTemplate, 'home', $viewportWidth)
		: []) as PageModuleData[];
	$: homeLayout = homeTemplate
		? getEffectivePageGrid(homeTemplate, 'home', $viewportWidth)
		: { gridRows: 2, gridColumns: 1 };

	$: hasPageModules = Array.isArray(homeModules) && homeModules.length > 0;

	$: if (data.pageModules !== undefined || homeModules.length) {
		logger.debug('[Home] Page modules check:', {
			hasPageModules,
			pageModulesCount: homeModules.length,
			viewportWidth: $viewportWidth
		});
	}

	$: pageForRenderer = hasPageModules
		? {
				_id: 'home',
				title: undefined,
				subtitle: undefined,
				layout: { gridRows: homeLayout.gridRows, gridColumns: homeLayout.gridColumns }
			}
		: null;
</script>

<svelte:head>
	<title>{$productName}</title>
</svelte:head>

{#if hasPageModules}
	<!-- Use PageRenderer when pageModules are configured -->
	<PageRenderer page={pageForRenderer as any} modules={homeModules} />
{:else}
	<!-- Fallback to template switcher for legacy templates -->
	<HomeTemplateSwitcher {data} />
{/if}
