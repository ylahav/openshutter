<script lang="ts">
	import { siteConfigData } from '$stores/siteConfig';
	import PageRenderer from '$lib/page-builder/PageRenderer.svelte';
	import { activeTemplate } from '$stores/template';
	import { logger } from '$lib/utils/logger';
	import { getTemplatePack } from '$lib/template-packs/registry';
	import { pageBuilderHeaderShellClass } from '$lib/template-packs/page-builder-chrome';
	import type { PageModuleData } from '$lib/types/page-builder';
	import { getEffectivePageModules, getEffectivePageGrid } from '$lib/template/breakpoints';
	import { viewportWidth } from '$lib/stores/viewport';
	import { DEFAULT_PAGE_MODULES, DEFAULT_PAGE_LAYOUTS } from '$lib/constants/default-page-layouts';

	$: pageModulesRaw = getEffectivePageModules($siteConfigData?.template, 'header', $viewportWidth);
	$: hasPageModules = Array.isArray(pageModulesRaw) && pageModulesRaw.length > 0;
	$: pageLayout = getEffectivePageGrid($siteConfigData?.template, 'header', $viewportWidth) || DEFAULT_PAGE_LAYOUTS.header;
	$: pageModules = ((hasPageModules ? pageModulesRaw : DEFAULT_PAGE_MODULES.header) || []) as PageModuleData[];
	$: usePageRenderer = pageModules.length > 0;

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
	$: pageForRenderer = usePageRenderer ? ({
		_id: 'header',
		title: {} as any,
		subtitle: {} as any,
		layout: pageLayout ? { gridRows: pageLayout.gridRows, gridColumns: pageLayout.gridColumns } : undefined
	} as any) : null;

	$: pack = getTemplatePack($activeTemplate);
	/** Match active pack chrome when using page builder (otherwise switching packs did not change the header strip). */
	$: headerPbShellClass = pageBuilderHeaderShellClass($activeTemplate);
</script>

{#if usePageRenderer}
	<!-- Use PageRenderer from page modules/defaults -->
	<header class="w-full {headerPbShellClass}">
		<div class="@container os-shell-container">
			<PageRenderer page={pageForRenderer} modules={pageModules} compact={true} />
		</div>
	</header>
{:else}
	<!-- Fallback to template switcher for legacy templates -->
	{#if pack.components?.Header}
		<svelte:component this={pack.components.Header} />
	{:else}
		<!-- Fallback: ensure header always renders -->
		<svelte:component this={getTemplatePack('noir').components?.Header} />
	{/if}
{/if}
