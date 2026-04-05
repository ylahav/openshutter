<script lang="ts">
	import { onMount } from 'svelte';
	import { derived } from 'svelte/store';
	import { currentLanguage } from '$stores/language';
	import { siteConfigData, siteConfig, publicSiteLogo } from '$stores/siteConfig';
	import { auth, logout } from '$lib/stores/auth';
	import { getProductName } from '$lib/utils/productName';
	import LanguageSelector from '$components/LanguageSelector.svelte';
	import TemplateSelector from '$components/TemplateSelector.svelte';
	import ThemeToggle from '$components/ThemeToggle.svelte';
	import Menu from '$components/Menu.svelte';
	import NotificationNavLink from '$lib/components/NotificationNavLink.svelte';
	import { t } from '$stores/i18n';
	import { resolveHeaderVisibilityForPack } from '$lib/template-packs/header-visibility';

	const year = new Date().getFullYear();

	const headerConfig = derived(siteConfigData, ($config) => $config?.template?.headerConfig ?? {});

	$: ({
		showLogo,
		showSiteTitle,
		showMenu,
		showTemplateSelector,
		showLanguageSelector,
		showThemeToggle,
		showAuthButtons,
		showGreeting
	} = resolveHeaderVisibilityForPack('default', $headerConfig));

	const title = derived(
		[siteConfigData, currentLanguage],
		([$config, $lang]) => getProductName($config ?? null, $lang)
	);

	const logo = publicSiteLogo;

	onMount(() => {
		if (typeof window !== 'undefined' && window.location.pathname !== '/login') {
			siteConfig.load().catch(() => {});
		}
	});

	async function handleLogout() {
		await logout();
	}
</script>

<header
	class="bg-white/95 dark:bg-slate-950/95 backdrop-blur-md shadow-sm border-b border-slate-200/90 dark:border-slate-700/80"
>
	<div class="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
		<div class="flex justify-between items-center h-16">
			<!-- Logo and title -->
			<div class="flex items-center space-x-3">
				{#if showLogo}
					{#if $logo}
						<img
							src={$logo}
							alt={$title}
							class="w-10 h-10 object-contain shrink-0"
						/>
					{:else}
						<div class="w-10 h-10 bg-primary-600 rounded-lg flex items-center justify-center shrink-0">
							<svg class="w-6 h-6 text-white" fill="none" stroke="currentColor" viewBox="0 0 24 24">
								<path
									stroke-linecap="round"
									stroke-linejoin="round"
									stroke-width="2"
									d="M3 9a2 2 0 012-2h.93a2 2 0 001.664-.89l.812-1.22A2 2 0 0110.07 4h3.86a2 2 0 011.664.89l.812 1.22A2 2 0 0018.07 7H19a2 2 0 012 2v9a2 2 0 01-2 2H5a2 2 0 01-2-2V9z"
								/>
								<path
									stroke-linecap="round"
									stroke-linejoin="round"
									stroke-width="2"
									d="M15 13a3 3 0 11-6 0 3 3 0 016 0z"
								/>
							</svg>
						</div>
					{/if}
				{/if}

				{#if showSiteTitle}
					<div class="flex flex-col">
						<a href="/" class="text-xl font-bold text-gray-900 dark:text-gray-100 hover:text-primary-600 transition-colors">
							{$title}
						</a>
					</div>
				{/if}
			</div>

			<!-- Navigation -->
			{#if showMenu || showTemplateSelector || showLanguageSelector || showThemeToggle}
				<div class="hidden md:flex items-center gap-4 text-sm text-gray-600 dark:text-gray-300">
					{#if showMenu}
						<Menu
							config={$headerConfig}
							itemClass="hover:text-gray-900 dark:hover:text-gray-100"
							activeItemClass="text-primary-600 font-medium"
							containerClass="flex items-center gap-4"
							showActiveIndicator={true}
							showAuthButtons={showAuthButtons}
						/>

						{#if showAuthButtons && $auth.authenticated && $auth.user}
							<span class="text-gray-400 dark:text-gray-500">|</span>
							<NotificationNavLink
								linkClass="relative text-gray-600 hover:text-gray-900 dark:text-gray-300 dark:hover:text-gray-100"
							/>
							{#if showGreeting}
								<span class="text-gray-400 dark:text-gray-500">|</span>
								<span class="text-gray-500 dark:text-gray-400">{$auth.user.name || $auth.user.email}</span>
							{/if}
							<button
								on:click={handleLogout}
								class="hover:text-gray-900 dark:hover:text-gray-100 text-gray-600 dark:text-gray-300"
								type="button"
							>
								{$t('header.logout')}
							</button>
						{/if}
					{/if}

					<!-- Template selector (if enabled) -->
					{#if showTemplateSelector}
						<div class="ms-4">
							<TemplateSelector compact={true} />
						</div>
					{/if}

					<!-- Language selector (if enabled) -->
					{#if showLanguageSelector}
						<div class="ms-6">
							<LanguageSelector compact={true} />
						</div>
					{/if}

					<!-- Theme toggle (if enabled) -->
					{#if showThemeToggle}
						<div class="ms-6">
							<ThemeToggle />
						</div>
					{/if}
				</div>
			{/if}
		</div>
	</div>
</header>
