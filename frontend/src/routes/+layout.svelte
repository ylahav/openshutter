<script lang="ts">
	import { onMount } from 'svelte';
	import { page } from '$app/stores';
	import type { LayoutData } from './$types';
	import '$lib/styles/globals.css';
	import { siteConfig, publicSiteFavicon } from '$stores/siteConfig';
	import { loadSession } from '$lib/stores/auth';
	import PackFallbackBanner from '$lib/components/PackFallbackBanner.svelte';
	import AdminAppChrome from '$lib/components/AdminAppChrome.svelte';
	import ThemeProvider from '$lib/components/ThemeProvider.svelte';
	import ThemeColorApplier from '$lib/components/ThemeColorApplier.svelte';
	import TokenRenewalNotification from '$lib/components/TokenRenewalNotification.svelte';
	import PhotoCopyProtection from '$lib/components/PhotoCopyProtection.svelte';
	import { logger } from '$lib/utils/logger';
	import { canonicalUrlFromPageUrl, pathShouldNoindex } from '$lib/utils/canonical-url';

	export let data: LayoutData;

	/**
	 * Seed site config on SSR and on navigation before child routes render.
	 * Hydrating only in `onMount` left `siteConfigData` null during SSR, so `$activeTemplate`
	 * fell back as if the pack were unset and `PageRenderer` could pick Atelier’s hero override
	 * while the real pack (e.g. studio) came from `data.visitorTemplatePack`.
	 */
	$: if (data.visitorSiteConfig) {
		siteConfig.hydrateFromServer(data.visitorSiteConfig);
	}

	/** Inline fallback when site config has no favicon yet (avoids undefined href on SSR). */
	const DEFAULT_FAVICON =
		'data:image/svg+xml,' +
		encodeURIComponent(
			'<svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 32 32"><rect width="32" height="32" rx="6" fill="#4f46e5"/></svg>',
		);

	$: canonicalHref = canonicalUrlFromPageUrl($page.url);
	$: noindexPanel = pathShouldNoindex($page.url.pathname);
	$: faviconFromConfig =
		$publicSiteFavicon != null && String($publicSiteFavicon).trim() !== ''
			? String($publicSiteFavicon).trim()
			: '';
	$: faviconHref = faviconFromConfig || DEFAULT_FAVICON;
	$: isAdminRoute = $page.url.pathname.startsWith('/admin');
	$: publicShellPromise = isAdminRoute
		? null
		: import('$lib/components/BodyTemplateWrapper.svelte');

	// Client refresh + auth (site config already hydrated from layout `data` above)
	onMount(() => {
		// Only load site config if not on login page
		if ($page.url.pathname !== '/login') {
			siteConfig.load().catch((err) => {
				// Silently fail - site config is not critical for login page
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
		<!-- Admin: static shell — visitor templating: docs/guides/TEMPLATING_USER_GUIDE.md -->
		<TokenRenewalNotification />
		<AdminAppChrome>
			<slot />
		</AdminAppChrome>
	{:else}
		<PhotoCopyProtection />
		<ThemeColorApplier initialSiteConfig={data.visitorSiteConfig ?? null} />
		<TokenRenewalNotification />
		<PackFallbackBanner />
		{#if publicShellPromise}
			{#await publicShellPromise then mod}
				<svelte:component this={mod.default}>
					<slot />
				</svelte:component>
			{/await}
		{/if}
	{/if}
</ThemeProvider>
