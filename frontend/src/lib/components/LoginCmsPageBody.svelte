<script lang="ts">
	import { onMount } from 'svelte';
	import type { PageData, PageModuleData } from '$lib/types/page-builder';
	import PageRenderer from '$lib/page-builder/PageRenderer.svelte';
	import { siteConfig, siteConfigData, productName } from '$stores/siteConfig';
	import { getPageGridForBreakpoint, getPageModulesForBreakpoint } from '$lib/template/breakpoints';
	import { DEFAULT_PAGE_LAYOUTS, DEFAULT_PAGE_MODULES } from '$lib/constants/default-page-layouts';

	let {
		rolePage,
		cmsModules,
		headerModules = [],
		footerModules = [],
		headerSticky = false,
		headerRowTemplates = undefined,
		footerRowTemplates = undefined
	}: {
		/** Resolved CMS login page document (or minimal stub from `role=login`). */
		rolePage: Record<string, unknown> | null;
		/** Modules returned with the resolved login page (may be empty). */
		cmsModules: unknown[] | null;
		headerModules?: PageModuleData[];
		footerModules?: PageModuleData[];
		headerSticky?: boolean;
		headerRowTemplates?: Record<string, string> | undefined;
		footerRowTemplates?: Record<string, string> | undefined;
	} = $props();

	function cloneModules(mods: any[]): any[] {
		return mods.map((m) => ({
			...m,
			props: m?.props && typeof m.props === 'object' && !Array.isArray(m.props) ? { ...m.props } : {}
		}));
	}

	function isMeaningfulPropValue(v: unknown): boolean {
		if (v === undefined || v === null) return false;
		if (typeof v === 'boolean') return true;
		if (typeof v === 'number') return Number.isFinite(v);
		if (typeof v === 'string') return v.trim().length > 0;
		if (Array.isArray(v)) return v.length > 0;
		if (typeof v === 'object') {
			return Object.values(v as Record<string, unknown>).some(
				(x) => x != null && String(x).trim() !== ''
			);
		}
		return true;
	}

	function mergeLoginFormProps(
		baseProps: Record<string, unknown>,
		cmsProps: Record<string, unknown>
	): Record<string, unknown> {
		const keys = new Set([...Object.keys(baseProps), ...Object.keys(cmsProps)]);
		const out: Record<string, unknown> = {};
		for (const k of keys) {
			const b = baseProps[k];
			const c = cmsProps[k];
			if (isMeaningfulPropValue(c)) out[k] = c;
			else if (isMeaningfulPropValue(b)) out[k] = b;
			else if (c !== undefined) out[k] = c;
			else out[k] = b;
		}
		return out;
	}

	function mergeLoginPageModules(templateMods: any[], cmsMods: unknown[] | null | undefined): any[] {
		const base = cloneModules(
			Array.isArray(templateMods) && templateMods.length > 0
				? templateMods
				: (DEFAULT_PAGE_MODULES.login as any[])
		);
		const tmplLf = base.find((m) => m?.type === 'loginForm');
		if (!Array.isArray(cmsMods) || cmsMods.length === 0) return base;

		const out = cloneModules(cmsMods as any[]);
		const idx = out.findIndex((m) => m?.type === 'loginForm');
		if (idx < 0) return base;

		const baseProps =
			tmplLf?.props && typeof tmplLf.props === 'object' && !Array.isArray(tmplLf.props)
				? (tmplLf.props as Record<string, unknown>)
				: {};
		const cmsProps =
			out[idx]?.props && typeof out[idx].props === 'object' && !Array.isArray(out[idx].props)
				? (out[idx].props as Record<string, unknown>)
				: {};
		out[idx] = { ...out[idx], props: mergeLoginFormProps(baseProps, cmsProps) };
		return out;
	}

	onMount(() => {
		siteConfig.load().catch(() => {});
	});

	const template = $derived($siteConfigData?.template || {});
	const loginLayoutRaw = $derived(
		getPageGridForBreakpoint(
			{
				pageLayout: template.pageLayout,
				pageLayoutByBreakpoint: template.pageLayoutByBreakpoint
			},
			'login',
			'lg'
		)
	);
	const loginModulesRaw = $derived(
		getPageModulesForBreakpoint(
			{
				pageModules: template.pageModules,
				pageModulesByBreakpoint: template.pageModulesByBreakpoint
			},
			'login',
			'lg'
		)
	);
	const loginModules = $derived(
		mergeLoginPageModules(
			Array.isArray(loginModulesRaw) && loginModulesRaw.length > 0 ? (loginModulesRaw as any[]) : [],
			cmsModules
		)
	);
	const loginLayout = $derived(loginLayoutRaw ?? DEFAULT_PAGE_LAYOUTS.login);
	const rp = $derived(rolePage);

	function truthyHideLoginTitle(raw: unknown): boolean {
		return raw === true || raw === 'true' || raw === 1 || raw === '1';
	}

	const loginPage = $derived({
		_id: (rp?._id as string | undefined) ?? 'login',
		title: (rp?.title as PageData['title']) ?? {},
		subtitle: (rp?.subtitle as PageData['subtitle']) ?? {},
		layout: loginLayout,
		hideLoginTitle: truthyHideLoginTitle(rp?.hideLoginTitle)
	} satisfies PageData);
</script>

<svelte:head>
	<title>Sign In - {$productName}</title>
</svelte:head>

<PageRenderer
	page={loginPage as any}
	modules={loginModules as any}
	{headerModules}
	{footerModules}
	{headerSticky}
	{headerRowTemplates}
	{footerRowTemplates}
/>
