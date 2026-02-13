<script lang="ts">
	import { siteConfigData } from '$stores/siteConfig';
	import PageRenderer from '$lib/page-builder/PageRenderer.svelte';
	import DefaultHeader from '$lib/templates/default/components/Header.svelte';
	import ModernHeader from '$lib/templates/modern/components/Header.svelte';
	import MinimalHeader from '$lib/templates/minimal/components/Header.svelte';
	import ElegantHeader from '$lib/templates/elegant/components/Header.svelte';
	import { activeTemplate } from '$stores/template';
	import { logger } from '$lib/utils/logger';

	// Check if we have pageModules for header - if so, use PageRenderer instead of template switcher
	$: hasPageModules = $siteConfigData?.template?.pageModules?.header && 
		Array.isArray($siteConfigData.template.pageModules.header) && 
		$siteConfigData.template.pageModules.header.length > 0;
	$: pageLayout = $siteConfigData?.template?.pageLayout?.header;
	$: pageModules = hasPageModules && $siteConfigData?.template?.pageModules?.header ? $siteConfigData.template.pageModules.header : [];

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
</script>

{#if hasPageModules}
	<!-- Use PageRenderer when pageModules are configured -->
	<header class="w-full bg-white shadow-sm border-b border-gray-200">
		<div class="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
			<PageRenderer page={pageForRenderer} modules={pageModules} compact={true} />
		</div>
	</header>
{:else}
	<!-- Fallback to template switcher for legacy templates -->
	{#if $activeTemplate === 'minimal'}
		<MinimalHeader />
	{:else if $activeTemplate === 'modern'}
		<ModernHeader />
	{:else if $activeTemplate === 'elegant'}
		<ElegantHeader />
	{:else if $activeTemplate === 'default'}
		<DefaultHeader />
	{:else}
		<!-- Fallback: use default template -->
		<DefaultHeader />
	{/if}
{/if}
