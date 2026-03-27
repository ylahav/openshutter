<script lang="ts">
	import { siteConfigData } from '$stores/siteConfig';
	import PageRenderer from '$lib/page-builder/PageRenderer.svelte';
	import { activeTemplate } from '$stores/template';
	import { logger } from '$lib/utils/logger';
	import { getTemplatePack } from '$lib/template-packs/registry';
	import type { PageModuleData } from '$lib/types/page-builder';

	// Check if we have pageModules for header - if so, use PageRenderer instead of template switcher
	$: hasPageModules = $siteConfigData?.template?.pageModules?.header && 
		Array.isArray($siteConfigData.template.pageModules.header) && 
		$siteConfigData.template.pageModules.header.length > 0;
	$: pageLayout = $siteConfigData?.template?.pageLayout?.header;
	$: pageModules = (hasPageModules && $siteConfigData?.template?.pageModules?.header
		? ($siteConfigData.template.pageModules.header as PageModuleData[])
		: []) as PageModuleData[];

	// Debug logging
	$: if ($siteConfigData?.template?.pageModules?.header !== undefined) {
		logger.debug('[Header] Page modules check:', {
			hasPageModules,
			pageModulesCount: pageModules.length,
			pageModules,
			pageLayout
		});
	}

	// Create a page object for PageRenderer
	$: pageForRenderer = hasPageModules ? ({
		_id: 'header',
		title: {} as any,
		subtitle: {} as any,
		layout: pageLayout ? { gridRows: pageLayout.gridRows, gridColumns: pageLayout.gridColumns } : undefined
	} as any) : null;

	$: pack = getTemplatePack($activeTemplate);
</script>

{#if hasPageModules}
	<!-- Use PageRenderer when pageModules are configured -->
	<header class="w-full bg-white dark:bg-gray-900 shadow-sm border-b border-gray-200 dark:border-gray-700">
		<div class="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
			<PageRenderer page={pageForRenderer} modules={pageModules} compact={true} />
		</div>
	</header>
{:else}
	<!-- Fallback to template switcher for legacy templates -->
	{#if pack.components?.Header}
		<svelte:component this={pack.components.Header} />
	{:else}
		<!-- Fallback: ensure header always renders -->
		<svelte:component this={getTemplatePack('default').components?.Header} />
	{/if}
{/if}
