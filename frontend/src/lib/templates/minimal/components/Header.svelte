<script lang="ts">
	import { onMount } from 'svelte';
	import { derived } from 'svelte/store';
	import { currentLanguage } from '$stores/language';
	import { siteConfigData, siteConfig } from '$stores/siteConfig';
	import { auth, logout } from '$lib/stores/auth';
	import { MultiLangUtils } from '$utils/multiLang';
	import LanguageSelector from '$components/LanguageSelector.svelte';
	import TemplateSelector from '$components/TemplateSelector.svelte';
	import ThemeToggle from '$components/ThemeToggle.svelte';
	import Menu from '$components/Menu.svelte';
	import { t } from '$stores/i18n';

	const year = new Date().getFullYear();

	const headerConfig = derived(siteConfigData, ($config) => $config?.template?.headerConfig ?? {});
	
	// Check headerConfig values - explicitly check for false to respect overrides
	$: showLogo = $headerConfig?.showLogo !== undefined ? $headerConfig.showLogo : true;
	$: showSiteTitle = $headerConfig?.showSiteTitle !== undefined ? $headerConfig.showSiteTitle : true;
	$: showMenu = $headerConfig?.showMenu !== undefined ? $headerConfig.showMenu : true;
	$: showTemplateSelector = $headerConfig?.showTemplateSelector !== undefined ? $headerConfig.showTemplateSelector : true;
	$: showLanguageSelector = ($headerConfig?.showLanguageSelector ?? $headerConfig?.enableLanguageSelector) !== undefined 
		? ($headerConfig.showLanguageSelector ?? $headerConfig.enableLanguageSelector) 
		: true;
	$: showThemeToggle = $headerConfig?.enableThemeToggle !== undefined ? $headerConfig.enableThemeToggle : true;
	$: showAuthButtons = $headerConfig?.showAuthButtons !== undefined ? $headerConfig.showAuthButtons : true;
	$: showGreeting = $headerConfig?.showGreeting !== undefined ? $headerConfig.showGreeting : true;

	const title = derived(
		[siteConfigData, currentLanguage],
		([$config, $lang]) =>
			$config?.title ? MultiLangUtils.getTextValue($config.title, $lang) : 'OpenShutter'
	);

	const logo = derived(siteConfigData, ($config) => $config?.logo ?? '');

	onMount(() => {
		if (typeof window !== 'undefined' && window.location.pathname !== '/login') {
			siteConfig.load().catch(() => {});
		}
	});

	async function handleLogout() {
		await logout();
	}
</script>

<header class="bg-white border-b border-black sticky top-0 z-50">
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
						<div class="w-10 h-10 bg-black rounded flex items-center justify-center shrink-0">
							<svg class="w-6 h-6 text-white" fill="none" stroke="currentColor" viewBox="0 0 24 24">
								<path
									stroke-linecap="round"
									stroke-linejoin="round"
									stroke-width="1.5"
									d="M3 9a2 2 0 012-2h.93a2 2 0 001.664-.89l.812-1.22A2 2 0 0110.07 4h3.86a2 2 0 011.664.89l.812 1.22A2 2 0 0018.07 7H19a2 2 0 012 2v9a2 2 0 01-2 2H5a2 2 0 01-2-2V9z"
								/>
								<path
									stroke-linecap="round"
									stroke-linejoin="round"
									stroke-width="1.5"
									d="M15 13a3 3 0 11-6 0 3 3 0 016 0z"
								/>
							</svg>
						</div>
					{/if}
				{/if}

				{#if showSiteTitle}
					<div class="flex flex-col">
						<a href="/" class="text-xl font-light text-black hover:text-gray-600 transition-colors tracking-tight">
							{$title}
						</a>
					</div>
				{/if}
			</div>

			<!-- Navigation -->
			{#if showMenu || showTemplateSelector || showLanguageSelector || showThemeToggle}
				<div class="hidden md:flex items-center gap-6 text-sm text-black">
					{#if showMenu}
						<Menu
							config={$headerConfig}
							itemClass="hover:text-gray-600 font-light"
							activeItemClass="text-gray-600 font-light"
							containerClass="flex items-center gap-6"
							showActiveIndicator={true}
							showAuthButtons={showAuthButtons}
						/>

						{#if showAuthButtons && $auth.authenticated && $auth.user}
							<span class="text-gray-400">|</span>
							{#if showGreeting}
								<span class="text-gray-600 font-light">{$auth.user.name || $auth.user.email}</span>
							{/if}
							<button
								on:click={handleLogout}
								class="hover:text-gray-600 text-black font-light"
								type="button"
							>
								{$t('header.logout')}
							</button>
						{/if}
					{/if}

					<!-- Template selector (if enabled) -->
					{#if showTemplateSelector}
						<div class="ml-4">
							<TemplateSelector compact={true} />
						</div>
					{/if}

					<!-- Language selector (if enabled) -->
					{#if showLanguageSelector}
						<div class="ml-6">
							<LanguageSelector compact={true} />
						</div>
					{/if}

					<!-- Theme toggle (if enabled) -->
					{#if showThemeToggle}
						<div class="ml-6">
							<ThemeToggle />
						</div>
					{/if}
				</div>
			{/if}
		</div>
	</div>
</header>
