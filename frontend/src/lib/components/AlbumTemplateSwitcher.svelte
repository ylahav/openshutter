<script lang="ts">
	import { activeTemplate } from '$stores/template';
	import { siteConfigData } from '$stores/siteConfig';
	import { getTemplatePack } from '$lib/template/packs/registry';
	import PageRenderer from '$lib/page-builder/PageRenderer.svelte';
	import type { PageModuleData } from '$lib/types/page-builder';
	import { getEffectivePageGrid, getEffectivePageModules } from '$lib/template/breakpoints';
	import { viewportWidth } from '$lib/stores/viewport';

	$: packPromise = getTemplatePack($activeTemplate);

	// Allow album page to be fully driven by page-builder modules (Admin → Templates → Overrides).
	$: pageModulesRaw = getEffectivePageModules($siteConfigData?.template, 'album', $viewportWidth);
	$: hasPageModules = Array.isArray(pageModulesRaw) && pageModulesRaw.length > 0;
	$: pageLayout = getEffectivePageGrid($siteConfigData?.template, 'album', $viewportWidth);
	$: pageModules = (hasPageModules ? pageModulesRaw : []) as PageModuleData[];

	$: pageForRenderer = hasPageModules
		? ({
				_id: 'album',
				title: {} as any,
				subtitle: {} as any,
				layout: pageLayout
					? { gridRows: pageLayout.gridRows, gridColumns: pageLayout.gridColumns }
					: undefined
			} as any)
		: null;
</script>

{#if hasPageModules}
	<PageRenderer page={pageForRenderer} modules={pageModules} />
{:else}
	{#await packPromise then pack}
		<svelte:component this={pack.pages.Album} />
	{/await}
{/if}
