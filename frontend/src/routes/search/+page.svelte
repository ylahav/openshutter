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

	let { data }: { data: PageData } = $props();

const searchUiVariant = $derived(($activeTemplate === 'noir' ? 'noir' : 'default') as 'noir' | 'default');
	const initialQuery = $derived($page.url.searchParams.get('q') || '');

const aliasModules = $derived((data.aliasModules || []) as PageModuleData[]);
const headerModules = $derived(((data as { headerModules?: unknown }).headerModules ?? []) as PageModuleData[]);
const footerModules = $derived(((data as { footerModules?: unknown }).footerModules ?? []) as PageModuleData[]);
const aliasLayout = $derived(data.aliasPage?.layout && typeof data.aliasPage.layout === 'object'
			? {
					gridRows: Number((data.aliasPage.layout as any).gridRows) || 1,
					gridColumns: Number((data.aliasPage.layout as any).gridColumns) || 1
				}
			: { gridRows: 1, gridColumns: 1 });
const hasAliasModules = $derived(Array.isArray(aliasModules) && aliasModules.length > 0);

const searchTemplate = $derived($siteConfigData?.template ??
		(data.pageModules?.length || data.pageLayout
			? {
					pageModules: data.pageModules?.length ? { search: data.pageModules } : undefined,
					pageLayout: data.pageLayout ? { search: data.pageLayout } : undefined
				}
			: undefined));

const searchModules = $derived((searchTemplate
		? getEffectivePageModules(searchTemplate, 'search', $viewportWidth)
		: []) as PageModuleData[]);
const searchLayout = $derived(searchTemplate
		? getEffectivePageGrid(searchTemplate, 'search', $viewportWidth)
		: { gridRows: 1, gridColumns: 1 });

const hasPageModules = $derived(hasAliasModules || (Array.isArray(searchModules) && searchModules.length > 0));
const pageForRenderer = $derived(hasPageModules
		? ({
				_id: (data.aliasPage?._id as string) || 'search',
				title: {} as any,
				subtitle: {} as any,
				layout: hasAliasModules
					? { gridRows: aliasLayout.gridRows, gridColumns: aliasLayout.gridColumns }
					: { gridRows: searchLayout.gridRows, gridColumns: searchLayout.gridColumns }
			} as any)
		: null);
</script>

<svelte:head>
	<title>{$t('search.title')} - {$productName}</title>
</svelte:head>

{#if hasPageModules}
	<PageRenderer page={pageForRenderer as any} modules={hasAliasModules ? aliasModules : searchModules} {headerModules} {footerModules} />
{:else}
	<SearchTemplateSwitcher {initialQuery} variant={searchUiVariant} />
{/if}
