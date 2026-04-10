<script lang="ts">
	import { onMount } from 'svelte';
	import PageRenderer from '$lib/page-builder/PageRenderer.svelte';
	import { siteConfig, siteConfigData, productName } from '$stores/siteConfig';
	import { getPageGridForBreakpoint, getPageModulesForBreakpoint } from '$lib/template/breakpoints';

	const LOGIN_FALLBACK_MODULES = [
		{
			_id: 'mod_runtime_login_form',
			type: 'loginForm',
			props: {},
			rowOrder: 0,
			columnIndex: 0,
			rowSpan: 1,
			colSpan: 1
		}
	];

	onMount(() => {
		// +layout intentionally skips siteConfig.load() on /login, but login layout/modules need it.
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
	$: loginModules =
		Array.isArray(loginModulesRaw) && loginModulesRaw.length > 0
			? (loginModulesRaw as any[])
			: LOGIN_FALLBACK_MODULES;
	$: loginPage = {
		_id: 'login',
		title: {},
		subtitle: {},
		layout: loginLayout
	};
</script>

<svelte:head>
	<title>Sign In - {$productName}</title>
</svelte:head>

<PageRenderer page={loginPage as any} modules={loginModules as any} />
