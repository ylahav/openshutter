<!-- Pack defaults (theme.defaults.json) + site_config overrides as CSS variables; SSR + client. -->
<script lang="ts">
	import { onMount, onDestroy } from 'svelte';
	import { page } from '$app/stores';
	import { siteConfigData } from '$stores/siteConfig';
	import { resolvedTheme } from '$lib/stores/theme';
	import { browser } from '$app/environment';
	import type { SiteConfig } from '$lib/types/site-config';
	import { buildGoogleFontsUrl } from '$lib/constants/google-fonts';
	import {
		buildVisitorThemeStylesheet,
		visitorThemeGoogleFontFamilies
	} from '$lib/theme/build-visitor-theme-css';

	let {
		initialSiteConfig = null
	}: {
		initialSiteConfig?: SiteConfig | null;
	} = $props();

	let styleElement: HTMLStyleElement | null = $state(null);
	let googleFontsLink: HTMLLinkElement | null = $state(null);

	const effectiveConfig = $derived($siteConfigData ?? initialSiteConfig);

	const ssrCss = $derived(
		!browser && effectiveConfig
			? buildVisitorThemeStylesheet(effectiveConfig, $page.url.pathname, $page.data)
			: ''
	);

	const ssrFontsHref = $derived(
		!browser && effectiveConfig
			? buildGoogleFontsUrl(
					visitorThemeGoogleFontFamilies(effectiveConfig, $page.url.pathname, $page.data)
				)
			: ''
	);

	/** Avoid literal `<style>` in this file — Svelte preprocess treats it as scoped CSS. */
	const ssrThemeDataHref = $derived(
		!browser && ssrCss ? `data:text/css;charset=utf-8,${encodeURIComponent(ssrCss)}` : ''
	);

	function applyGoogleFontsLink(fontFamilies: string[]) {
		if (!browser || !document.head) return;
		const url = buildGoogleFontsUrl(fontFamilies);
		if (googleFontsLink && googleFontsLink.parentNode) {
			googleFontsLink.parentNode.removeChild(googleFontsLink);
			googleFontsLink = null;
		}
		if (url) {
			googleFontsLink = document.createElement('link');
			googleFontsLink.id = 'theme-google-fonts';
			googleFontsLink.rel = 'stylesheet';
			googleFontsLink.href = url;
			document.head.appendChild(googleFontsLink);
		}
	}

	function applyCustomColors() {
		if (!browser) return;

		const config = $siteConfigData ?? initialSiteConfig;
		if (!config) return;

		const fontFamilies = visitorThemeGoogleFontFamilies(config, $page.url.pathname, $page.data);
		applyGoogleFontsLink(fontFamilies);

		const existingTheme = document.getElementById('theme-custom-colors');
		if (existingTheme?.parentNode) {
			existingTheme.parentNode.removeChild(existingTheme);
		}
		styleElement = null;

		styleElement = document.createElement('style');
		styleElement.id = 'theme-custom-colors';
		document.head.appendChild(styleElement);

		styleElement.textContent = buildVisitorThemeStylesheet(config, $page.url.pathname, $page.data);
	}

$effect(() => { if (browser && effectiveConfig) {
		applyCustomColors();
	} });

$effect(() => { if (browser && $resolvedTheme) {
		if (effectiveConfig) applyCustomColors();
	} });

	onMount(() => {
		if (browser) {
			applyCustomColors();
		}
	});

	onDestroy(() => {
		if (browser) {
			if (styleElement && styleElement.parentNode) {
				styleElement.parentNode.removeChild(styleElement);
			}
			if (googleFontsLink && googleFontsLink.parentNode) {
				googleFontsLink.parentNode.removeChild(googleFontsLink);
			}
		}
	});
</script>

<svelte:head>
	{#if ssrFontsHref}
		<link rel="stylesheet" href={ssrFontsHref} />
	{/if}
	{#if ssrThemeDataHref}
		<link rel="stylesheet" href={ssrThemeDataHref} id="theme-custom-colors" />
	{/if}
</svelte:head>
