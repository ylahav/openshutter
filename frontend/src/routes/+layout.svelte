<script lang="ts">
	import { onMount } from 'svelte';
	import { page } from '$app/stores';
	import '$lib/styles/globals.css';
	import { siteConfig } from '$stores/siteConfig';
	import { loadSession } from '$lib/stores/auth';
	import HeaderTemplateSwitcher from '$lib/components/HeaderTemplateSwitcher.svelte';
	import FooterTemplateSwitcher from '$lib/components/FooterTemplateSwitcher.svelte';
	import BodyTemplateWrapper from '$lib/components/BodyTemplateWrapper.svelte';
	import ThemeProvider from '$lib/components/ThemeProvider.svelte';
	import TokenRenewalNotification from '$lib/components/TokenRenewalNotification.svelte';

	// Initialize site config and auth on mount (skip on login page)
	onMount(() => {
		// Only load site config if not on login page
		if ($page.url.pathname !== '/login') {
			siteConfig.load().catch((err) => {
				// Silently fail - site config is not critical for login page
				console.warn('Failed to load site config:', err);
			});
		}
		loadSession();

		// Unregister any existing service workers from Next.js
		if (typeof navigator !== 'undefined' && 'serviceWorker' in navigator) {
			navigator.serviceWorker.getRegistrations().then((registrations) => {
				for (const registration of registrations) {
					registration.unregister().then((success) => {
						if (success) {
							console.log('Service worker unregistered');
						}
					});
				}
			});
		}
	});
</script>

<ThemeProvider defaultTheme="system" enableSystem={true} disableTransitionOnChange={false}>
	<TokenRenewalNotification />
	<HeaderTemplateSwitcher />

	<BodyTemplateWrapper>
		<slot />
	</BodyTemplateWrapper>

	<FooterTemplateSwitcher />
</ThemeProvider>
