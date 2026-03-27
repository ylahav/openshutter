<script lang="ts">
	import { siteConfigData } from '$stores/siteConfig';
	import PageRenderer from '$lib/page-builder/PageRenderer.svelte';
	import { activeTemplate } from '$stores/template';
	import { logger } from '$lib/utils/logger';
	import { DEFAULT_PAGE_MODULES, DEFAULT_PAGE_LAYOUTS } from '$lib/constants/default-page-layouts';
	import { getTemplatePack } from '$lib/template-packs/registry';

	// Check if we have pageModules for footer - if so, use PageRenderer instead of template switcher
	// Fall back to default footer modules if not configured in siteConfig
	$: configFooterModules = $siteConfigData?.template?.pageModules?.footer;
	$: hasPageModules = configFooterModules && 
		Array.isArray(configFooterModules) && 
		configFooterModules.length > 0;
	$: pageLayout = $siteConfigData?.template?.pageLayout?.footer || DEFAULT_PAGE_LAYOUTS.footer;

	// Default footer modules (social + copyright); ensure we always include social media
	const defaultFooterModules = DEFAULT_PAGE_MODULES.footer || [];
	const defaultSocialModule = defaultFooterModules.find((m: any) => m.type === 'socialMedia');

	// If config has footer modules but none is socialMedia, prepend the default social module so it always shows
	$: pageModules = (() => {
		const base = hasPageModules && configFooterModules ? configFooterModules : defaultFooterModules;
		if (!base.length) return base;
		const hasSocial = base.some((m: any) => m.type === 'socialMedia');
		if (hasSocial || !defaultSocialModule) return base;
		// Prepend social media (row 0), and shift existing modules' rowOrder so copyright stays below
		const socialWithRow = { ...defaultSocialModule, rowOrder: 0, columnIndex: 0 };
		const rest = base.map((m: any) => ({ ...m, rowOrder: (m.rowOrder ?? 0) + 1 }));
		return [socialWithRow, ...rest];
	})();

	// Ensure layout has enough rows when we merged in social
	$: layoutRows = pageModules.length > 0
		? Math.max(pageLayout?.gridRows ?? 1, ...pageModules.map((m: any) => (m.rowOrder ?? 0) + (m.rowSpan ?? 1)))
		: pageLayout?.gridRows ?? 1;
	$: effectiveLayout = { gridRows: layoutRows, gridColumns: pageLayout?.gridColumns ?? 1 };

	// Debug logging
	$: if ($siteConfigData?.template?.pageModules?.footer !== undefined) {
		logger.debug('[Footer] Page modules check:', {
			hasPageModules,
			pageModulesCount: pageModules?.length || 0,
			pageModules,
			effectiveLayout
		});
	}

	// Create a page object for PageRenderer
	// Use PageRenderer if we have modules (either from config or defaults)
	$: usePageRenderer = pageModules && pageModules.length > 0;
	$: pageForRenderer = usePageRenderer ? ({
		_id: 'footer',
		title: {} as any,
		subtitle: {} as any,
		layout: effectiveLayout
	} as any) : null;

	$: pack = getTemplatePack($activeTemplate);
</script>

{#if usePageRenderer}
	<!-- Use PageRenderer when pageModules are configured; light background so no black bar -->
	<footer class="w-full bg-gray-100 dark:bg-gray-800 border-t border-gray-200 dark:border-gray-700 mt-auto">
		<div class="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-6">
			<PageRenderer page={pageForRenderer} modules={pageModules} compact={true} />
		</div>
	</footer>
{:else}
	<!-- Fallback to template switcher for legacy templates -->
	{#if pack.components?.Footer}
		<svelte:component this={pack.components.Footer} />
	{:else}
		<svelte:component this={getTemplatePack('default').components?.Footer} />
	{/if}
{/if}
