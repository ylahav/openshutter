<script lang="ts">
	import { currentLanguage } from '$stores/language';
	import { productName } from '$stores/siteConfig';
	import { MultiLangUtils } from '$lib/utils/multiLang';
	import PageRenderer from '$lib/page-builder/PageRenderer.svelte';
	import CmsPageTemplateSwitcher from '$lib/components/CmsPageTemplateSwitcher.svelte';
	import AlbumTemplateSwitcher from '$lib/components/AlbumTemplateSwitcher.svelte';
	import { getTemplatePack } from '$lib/template-packs/registry';
	import { isPackAlbumShellRoute } from '$lib/utils/album-route-params';
	import type { PageData, PageModuleData } from '$lib/types/page-builder';

	export let data: {
		mode: 'cms' | 'pack-album';
		page: PageData | null;
		modules: PageModuleData[];
		urlAlias: string;
		urlParam: string;
		packId: string;
		cmsSlugPrefix: string;
	};

	$: pageData = data.page;
	$: modules = data.modules || [];
	$: hasModules = modules.length > 0;
	$: pageForCms = (pageData ?? undefined) as PageData | undefined;
	$: albumShell = isPackAlbumShellRoute(data.urlAlias);

	function getTextValue(value: string | { en?: string; he?: string } | undefined): string {
		if (!value) return '';
		if (typeof value === 'string') return value;
		return MultiLangUtils.getTextValue(value, $currentLanguage) || '';
	}
</script>

<svelte:head>
	{#if data.mode === 'cms' && pageForCms}
		<title>{getTextValue(pageForCms.title)} - {$productName}</title>
		{#if pageForCms.subtitle}
			<meta name="description" content={getTextValue(pageForCms.subtitle)} />
		{/if}
	{/if}
</svelte:head>

{#if data.mode === 'pack-album'}
	{#await getTemplatePack(data.packId) then pack}
		<svelte:component this={pack.pages.Album} />
	{/await}
{:else if hasModules && pageForCms}
	<PageRenderer page={pageForCms} modules={modules} />
{:else if albumShell}
	<AlbumTemplateSwitcher />
{:else if pageForCms}
	<CmsPageTemplateSwitcher page={pageForCms} />
{/if}
