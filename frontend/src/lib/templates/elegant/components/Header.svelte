<script lang="ts">
	import { onMount } from 'svelte';
	import { afterNavigate } from '$app/navigation';
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

	afterNavigate(() => {
		mobileMenuOpen = false;
	});

	async function handleLogout() {
		await logout();
	}

	let mobileMenuOpen = false;
	function toggleMobileMenu() {
		mobileMenuOpen = !mobileMenuOpen;
	}
	function closeMobileMenu() {
		mobileMenuOpen = false;
	}
</script>

<header class="bg-black/95 backdrop-blur-md border-b border-purple-500/30 sticky top-0 z-[100] shadow-2xl relative">
	<!-- Animated background gradient -->
	<div class="absolute inset-0 opacity-30 overflow-hidden">
		<div class="absolute top-0 left-1/4 w-64 h-64 bg-purple-500 rounded-full filter blur-3xl animate-pulse"></div>
		<div class="absolute bottom-0 right-1/4 w-64 h-64 bg-pink-500 rounded-full filter blur-3xl animate-pulse" style="animation-delay: 1s;"></div>
	</div>
	
	<div class="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 relative z-10">
		<div class="flex justify-between items-center h-20">
			<!-- Logo and title -->
			<div class="flex items-center space-x-4">
				{#if showLogo}
					{#if $logo}
						<img
							src={$logo}
							alt={$title}
							class="w-12 h-12 object-contain shrink-0"
						/>
					{:else}
						<div class="w-12 h-12 bg-linear-to-b from-purple-600 to-pink-600 rounded-xl flex items-center justify-center shrink-0 shadow-lg border border-purple-400/50">
							<svg class="w-7 h-7 text-white" fill="none" stroke="currentColor" viewBox="0 0 24 24">
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
						<a href="/" class="text-2xl font-serif text-white hover:text-purple-300 transition-colors tracking-wide" style="font-family: 'Playfair Display', serif;">
							{$title}
						</a>
					</div>
				{/if}
			</div>

			<!-- Mobile menu button -->
			{#if showMenu || showTemplateSelector || showLanguageSelector || showThemeToggle}
				<button
					type="button"
					class="md:hidden p-2 rounded-lg text-white hover:bg-white/10 focus:outline-none focus:ring-2 focus:ring-purple-400"
					aria-label="Open menu"
					aria-expanded={mobileMenuOpen}
					on:click={toggleMobileMenu}
				>
					{#if mobileMenuOpen}
						<svg class="w-6 h-6" fill="none" stroke="currentColor" viewBox="0 0 24 24" aria-hidden="true">
							<path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M6 18L18 6M6 6l12 12" />
						</svg>
					{:else}
						<svg class="w-6 h-6" fill="none" stroke="currentColor" viewBox="0 0 24 24" aria-hidden="true">
							<path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M4 6h16M4 12h16M4 18h16" />
						</svg>
					{/if}
				</button>
			{/if}

			<!-- Desktop Navigation -->
			{#if showMenu || showTemplateSelector || showLanguageSelector || showThemeToggle}
				<div class="hidden md:flex items-center gap-6 text-sm text-white relative">
					{#if showMenu}
						<Menu
							config={$headerConfig}
							itemClass="hover:text-purple-300 transition-colors font-light"
							activeItemClass="text-purple-300 font-medium"
							containerClass="flex items-center gap-6"
							showActiveIndicator={true}
							showAuthButtons={showAuthButtons}
						/>

						{#if showAuthButtons && $auth.authenticated && $auth.user}
							<span class="text-purple-400">|</span>
							{#if showGreeting}
								<span class="text-purple-200">{$auth.user.name || $auth.user.email}</span>
							{/if}
							<button
								on:click={handleLogout}
								class="hover:text-purple-300 text-white transition-colors font-light"
								type="button"
							>
								{$t('header.logout')}
							</button>
						{/if}
					{/if}

					<!-- Template selector (if enabled) -->
					{#if showTemplateSelector}
						<div class="ml-4 relative">
							<TemplateSelector compact={true} />
						</div>
					{/if}

					<!-- Language selector (if enabled) -->
					{#if showLanguageSelector}
						<div class="ml-6 relative">
							<LanguageSelector compact={true} />
						</div>
					{/if}

					<!-- Theme toggle (if enabled) -->
					{#if showThemeToggle}
						<div class="ml-6 relative">
							<ThemeToggle />
						</div>
					{/if}
				</div>
			{/if}
		</div>
	</div>

	<!-- Mobile menu panel -->
	{#if (showMenu || showTemplateSelector || showLanguageSelector || showThemeToggle) && mobileMenuOpen}
		<div
			class="md:hidden border-t border-purple-500/30 bg-black/98 backdrop-blur-md text-white"
			role="dialog"
			aria-label="Navigation menu"
		>
			<div class="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-4 space-y-4">
				{#if showMenu}
					<Menu
						config={$headerConfig}
						itemClass="block py-2 hover:text-purple-300 transition-colors font-light"
						activeItemClass="text-purple-300 font-medium"
						containerClass="flex flex-col gap-1"
						orientation="vertical"
						showActiveIndicator={true}
						showAuthButtons={showAuthButtons}
					/>
					{#if showAuthButtons && $auth.authenticated && $auth.user}
						<div class="pt-2 border-t border-white/10 flex flex-col gap-2">
							{#if showGreeting}
								<span class="text-purple-200 text-sm">{$auth.user.name || $auth.user.email}</span>
							{/if}
							<button
								on:click={() => { closeMobileMenu(); handleLogout(); }}
								class="text-left py-2 hover:text-purple-300 transition-colors font-light w-full"
								type="button"
							>
								{$t('header.logout')}
							</button>
						</div>
					{/if}
				{/if}
				<div class="flex flex-wrap items-center gap-4 pt-2 border-t border-white/10">
					{#if showTemplateSelector}
						<div><TemplateSelector compact={true} /></div>
					{/if}
					{#if showLanguageSelector}
						<div><LanguageSelector compact={true} /></div>
					{/if}
					{#if showThemeToggle}
						<div><ThemeToggle /></div>
					{/if}
				</div>
			</div>
		</div>
	{/if}
</header>
