<script lang="ts">
	import { siteConfigData } from '$stores/siteConfig';
	import PageRenderer from '$lib/page-builder/PageRenderer.svelte';
	import DefaultFooter from '$lib/templates/default/components/Footer.svelte';
	import ModernFooter from '$lib/templates/modern/components/Footer.svelte';
	import MinimalFooter from '$lib/templates/minimal/components/Footer.svelte';
	import ElegantFooter from '$lib/templates/elegant/components/Footer.svelte';
	import { activeTemplate } from '$stores/template';
	import { logger } from '$lib/utils/logger';
	import { DEFAULT_PAGE_MODULES, DEFAULT_PAGE_LAYOUTS } from '$lib/constants/default-page-layouts';

	// Check if we have pageModules for footer - if so, use PageRenderer instead of template switcher
	// Fall back to default footer modules if not configured in siteConfig
	$: configFooterModules = $siteConfigData?.template?.pageModules?.footer;
	$: hasPageModules = configFooterModules && 
		Array.isArray(configFooterModules) && 
		configFooterModules.length > 0;
	$: pageLayout = $siteConfigData?.template?.pageLayout?.footer || DEFAULT_PAGE_LAYOUTS.footer;
	$: pageModules = hasPageModules && configFooterModules
		? configFooterModules
		: (DEFAULT_PAGE_MODULES.footer || []);

	// Debug logging
	$: if ($siteConfigData?.template?.pageModules?.footer !== undefined) {
		logger.debug('[Footer] Page modules check:', {
			hasPageModules,
			pageModulesCount: pageModules?.length || 0,
			pageModules,
			pageLayout
		});
	}

	// Create a page object for PageRenderer
	// Use PageRenderer if we have modules (either from config or defaults)
	$: usePageRenderer = pageModules && pageModules.length > 0;
	$: pageForRenderer = usePageRenderer ? ({
		_id: 'footer',
		title: {} as any,
		subtitle: {} as any,
		layout: pageLayout ? { gridRows: pageLayout.gridRows, gridColumns: pageLayout.gridColumns } : undefined
	} as any) : null;
</script>

{#if usePageRenderer}
	<!-- Use PageRenderer when pageModules are configured -->
	<footer class="w-full">
		<PageRenderer page={pageForRenderer} modules={pageModules} compact={true} />
	</footer>
{:else}
	<!-- Fallback to template switcher for legacy templates -->
	{#if $activeTemplate === 'minimal'}
		<MinimalFooter />
	{:else if $activeTemplate === 'modern'}
		<ModernFooter />
	{:else if $activeTemplate === 'elegant'}
		<ElegantFooter />
	{:else if $activeTemplate === 'default'}
		<DefaultFooter />
	{:else}
		<!-- Fallback: use default template -->
		<DefaultFooter />
	{/if}
{/if}
