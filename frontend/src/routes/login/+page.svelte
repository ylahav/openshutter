<script lang="ts">
	import { onMount } from 'svelte';
	import PageRenderer from '$lib/page-builder/PageRenderer.svelte';
	import { siteConfig, siteConfigData, productName } from '$stores/siteConfig';
	import { activeTemplate } from '$stores/template';
	import { getPageGridForBreakpoint, getPageModulesForBreakpoint } from '$lib/template/breakpoints';
	import { getTemplatePack } from '$lib/template/packs/registry';

	onMount(() => {
		siteConfig.load().catch(() => {});
	});

	$: template = $siteConfigData?.template || {};
	$: loginLayout = getPageGridForBreakpoint(
		{
			pageLayout: template.pageLayout,
			pageLayoutByBreakpoint: template.pageLayoutByBreakpoint
		},
		'login',
		'lg'
	);
	$: loginModulesRaw = getPageModulesForBreakpoint(
		{
			pageModules: template.pageModules,
			pageModulesByBreakpoint: template.pageModulesByBreakpoint
		},
		'login',
		'lg'
	);
	$: hasConfiguredLoginModules = Array.isArray(loginModulesRaw) && loginModulesRaw.length > 0;
	$: loginModules = (hasConfiguredLoginModules ? loginModulesRaw : []) as any[];
	$: loginPage = {
		_id: 'login',
		title: {},
		subtitle: {},
		layout: loginLayout
	};
	$: packPromise = getTemplatePack($activeTemplate);
</script>

<svelte:head>
	<title>Sign In - {$productName}</title>
</svelte:head>

{#if hasConfiguredLoginModules}
	<PageRenderer page={loginPage as any} modules={loginModules as any} />
{:else}
	{#await packPromise then pack}
		<svelte:component this={pack.pages.Login} />
	{/await}
{/if}
