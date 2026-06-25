<script lang="ts">
	import { currentLanguage } from '$stores/language';
	import { productName } from '$stores/siteConfig';
	import { MultiLangUtils } from '$lib/utils/multiLang';
	import PageRenderer from '$lib/page-builder/PageRenderer.svelte';
	import CmsPageTemplateSwitcher from '$lib/components/CmsPageTemplateSwitcher.svelte';
	import AboutTemplateSwitcher from '$lib/components/AboutTemplateSwitcher.svelte';
	import ContactTemplateSwitcher from '$lib/components/ContactTemplateSwitcher.svelte';
	import LoginCmsPageBody from '$lib/components/LoginCmsPageBody.svelte';
	import type { PageData, PageModuleData } from '$lib/types/page-builder';

	let { data }: { data: {
		page: PageData | null;
		modules: PageModuleData[];
		headerModules?: PageModuleData[];
		footerModules?: PageModuleData[];
		headerSticky?: boolean;
		headerRowTemplates?: Record<string, string>;
		footerRowTemplates?: Record<string, string>;
		urlAlias: string;
		useLoginShell: boolean;
		cmsSlugPrefix: string;
		packId: string;
	} } = $props();

const pageData = $derived(data.page);
	const modules = $derived(data.modules || []);
	const headerModules = $derived(data.headerModules || []);
	const footerModules = $derived(data.footerModules || []);
	const headerSticky = $derived(data.headerSticky === true);
	const headerRowTemplates = $derived(data.headerRowTemplates);
	const footerRowTemplates = $derived(data.footerRowTemplates);
const hasModules = $derived(modules.length > 0);
	const urlAliasLower = $derived((data.urlAlias || '').toLowerCase());
	const pageForCms = $derived((pageData ?? undefined) as PageData | undefined);

	function getTextValue(value: string | { en?: string; he?: string } | undefined): string {
		if (!value) return '';
		if (typeof value === 'string') return value;
		return MultiLangUtils.getTextValue(value, $currentLanguage) || '';
	}
</script>

<svelte:head>
	{#if !data.useLoginShell}
		<title
			>{pageForCms ? `${getTextValue(pageForCms.title)} - ${$productName}` : `Page - ${$productName}`}</title
		>
		{#if pageForCms?.subtitle}
			<meta name="description" content={getTextValue(pageForCms.subtitle)} />
		{/if}
	{/if}
</svelte:head>

{#if data.useLoginShell}
	<LoginCmsPageBody
		rolePage={pageData as unknown as Record<string, unknown> | null}
		cmsModules={modules as unknown[]}
		{headerModules}
		{footerModules}
		{headerSticky}
		{headerRowTemplates}
		{footerRowTemplates}
	/>
{:else}
	{#if hasModules && pageForCms}
		<PageRenderer
			page={pageForCms}
			modules={modules}
			headerModules={headerModules}
			footerModules={footerModules}
			{headerSticky}
			{headerRowTemplates}
			{footerRowTemplates}
		/>
	{:else if urlAliasLower === 'about'}
		<AboutTemplateSwitcher page={pageForCms ?? null} />
	{:else if urlAliasLower === 'contact'}
		<ContactTemplateSwitcher page={pageForCms ?? null} />
	{:else}
		<CmsPageTemplateSwitcher page={pageForCms ?? null} />
	{/if}
{/if}
