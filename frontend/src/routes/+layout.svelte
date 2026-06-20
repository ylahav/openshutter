<script lang="ts">
	import { onMount } from 'svelte';
	import { page } from '$app/stores';
	import type { LayoutData } from './$types';
	import { siteConfig, publicSiteFavicon } from '$stores/siteConfig';
	import { loadSession } from '$lib/stores/auth';
	import PackFallbackBanner from '$lib/components/PackFallbackBanner.svelte';
	import ThemeProvider from '$lib/components/ThemeProvider.svelte';
	import ThemeColorApplier from '$lib/components/ThemeColorApplier.svelte';
	import TokenRenewalNotification from '$lib/components/TokenRenewalNotification.svelte';
	import PhotoCopyProtection from '$lib/components/PhotoCopyProtection.svelte';
	import { logger } from '$lib/utils/logger';
	import { canonicalUrlFromPageUrl, pathShouldNoindex } from '$lib/utils/canonical-url';

	let { data, children }: { data: LayoutData; children: import('svelte').Snippet } = $props();

	/**
	 * Seed site config on SSR and on navigation before child routes render.
	 * Hydrating only in `onMount` left `siteConfigData` null during SSR, so `$activeTemplate`
	 * fell back as if the pack were unset and `PageRenderer` could pick Atelier’s hero override
	 * while the real pack (e.g. studio) came from `data.visitorTemplatePack`.
	 */
	$effect(() => {
		if (data.visitorSiteConfig) {
			siteConfig.hydrateFromServer(data.visitorSiteConfig);
		}
	});

	/** Inline fallback when site config has no favicon yet (avoids undefined href on SSR). */
	const DEFAULT_FAVICON =
		'data:image/svg+xml,' +
		encodeURIComponent(
			'<svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 32 32"><rect width="32" height="32" rx="6" fill="#4f46e5"/></svg>',
		);

	const canonicalHref = $derived(canonicalUrlFromPageUrl($page.url));
	const noindexPanel = $derived(pathShouldNoindex($page.url.pathname));
	const faviconFromConfig = $derived(
		$publicSiteFavicon != null && String($publicSiteFavicon).trim() !== ''
			? String($publicSiteFavicon).trim()
			: ''
	);
	const faviconHref = $derived(faviconFromConfig || DEFAULT_FAVICON);
	const isAdminRoute = $derived($page.url.pathname.startsWith('/admin'));
	const publicShellPromise = $derived(
		isAdminRoute ? null : import('$lib/components/BodyTemplateWrapper.svelte')
	);

	// Client refresh + auth (site config already hydrated from layout `data` above)
	onMount(() => {
		// Skip re-fetch when rendering a theme preview — the SSR override must not be overwritten.
		const isPreview = $page.url.searchParams.has('preview-theme-id');
		if ($page.url.pathname !== '/login' && !isPreview) {
			siteConfig.load().catch((err) => {
				logger.warn('Failed to load site config:', err);
			});
		}
		loadSession();

		// Unregister any existing service workers from previous app versions
		if (typeof navigator !== 'undefined' && 'serviceWorker' in navigator) {
			navigator.serviceWorker.getRegistrations().then((registrations) => {
				for (const registration of registrations) {
					registration.unregister().then((success) => {
						if (success) {
							logger.debug('Service worker unregistered');
						}
					});
				}
			});
		}
	});
</script>

<svelte:head>
	<link rel="icon" href={faviconHref} />
	<link rel="canonical" href={canonicalHref} />
	<meta property="og:url" content={canonicalHref} />
	{#if noindexPanel}
		<meta name="robots" content="noindex, nofollow" />
	{/if}
</svelte:head>

<ThemeProvider defaultTheme="system" enableSystem={true} disableTransitionOnChange={false}>
	{#if isAdminRoute}
		<!-- Admin shell lives in routes/admin/+layout.svelte -->
		<TokenRenewalNotification />
		{@render children?.()}
	{:else}
		<PhotoCopyProtection />
		<ThemeColorApplier initialSiteConfig={data.visitorSiteConfig ?? null} />
		<TokenRenewalNotification />
		<PackFallbackBanner />
		{#if publicShellPromise}
			{#await publicShellPromise then mod}
				{@const Shell = mod.default}
				<Shell>{@render children?.()}</Shell>
			{/await}
		{/if}
	{/if}
</ThemeProvider>
