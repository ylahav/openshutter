<script lang="ts">
	import { onMount } from 'svelte';
	import { afterNavigate } from '$app/navigation';
	import { derived } from 'svelte/store';
	import { currentLanguage } from '$stores/language';
	import { siteConfigData, siteConfig, publicSiteLogo } from '$stores/siteConfig';
	import { auth, logout } from '$lib/stores/auth';
	import { getProductName } from '$lib/utils/productName';
	import LanguageSelector from '$components/LanguageSelector.svelte';
	import TemplateSelector from '$components/TemplateSelector.svelte';
	import { toggleTheme, resolvedTheme } from '$lib/stores/theme';
	import Menu from '$components/Menu.svelte';
	import NotificationNavLink from '$lib/components/NotificationNavLink.svelte';
	import { t } from '$stores/i18n';
	import { resolveHeaderVisibilityForPack } from '$lib/template-packs/header-visibility';

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
	} = resolveHeaderVisibilityForPack('noir', $headerConfig));

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

	/** Short monogram from title for logo text when no image */
	function initials(name: string): string {
		const parts = name.trim().split(/\s+/).filter(Boolean);
		if (parts.length === 0) return '·';
		if (parts.length === 1) return parts[0].slice(0, 2).toUpperCase();
		return (parts[0][0] + parts[parts.length - 1][0]).toUpperCase();
	}
</script>

<header
	class="fixed top-0 left-0 right-0 z-[100] flex items-center justify-between px-6 sm:px-8 py-5 mix-blend-difference transition-colors duration-300"
	style="font-family: var(--os-font-body); color: var(--tp-fg);"
>
	<a
		href="/"
		class="logo text-[13px] font-light tracking-[0.22em] uppercase no-underline shrink-0 transition-colors"
		style="color: var(--tp-fg);"
	>
		{#if showLogo && $logo}
			<img src={$logo} alt={$title} class="h-8 w-auto object-contain invert" />
		{:else if showSiteTitle}
			{initials($title)}
			<span class="opacity-60 mx-1">·</span>
			<span class="font-light">{$title.split(/\s+/)[0] ?? $title}</span>
		{:else}
			{$title}
		{/if}
	</a>

	{#if showMenu || showTemplateSelector || showLanguageSelector || showThemeToggle}
		<button
			type="button"
			class="md:hidden text-[10px] uppercase tracking-[0.18em] p-2 transition-colors"
			style="color: var(--tp-fg-muted);"
			aria-label="Menu"
			aria-expanded={mobileMenuOpen}
			on:click={toggleMobileMenu}
		>
			{mobileMenuOpen ? 'close' : 'menu'}
		</button>
	{/if}

	<nav class="hidden md:flex items-center gap-7">
		{#if showMenu}
			<Menu
				config={$headerConfig}
				itemClass="text-[10px] uppercase tracking-[0.18em] transition-colors no-underline text-[color:var(--tp-fg-muted)] hover:text-[color:var(--tp-fg)]"
				activeItemClass="text-[color:var(--tp-fg)]"
				containerClass="flex items-center gap-7"
				showActiveIndicator={false}
				showAuthButtons={false}
			/>
			{#if showAuthButtons && $auth.authenticated && $auth.user}
				{#if showGreeting}
					<span class="text-[9px] tracking-wider" style="color: var(--tp-fg-muted);">{$auth.user.name || $auth.user.email}</span>
				{/if}
				<button
					type="button"
					on:click={handleLogout}
					class="text-[10px] uppercase tracking-[0.18em] transition-colors text-[color:var(--tp-fg-muted)] hover:text-[color:var(--tp-fg)]"
				>
					{$t('header.logout')}
				</button>
			{/if}
		{/if}
		{#if showTemplateSelector}
			<div class="relative [&_button]:text-[10px] [&_button]:uppercase [&_button]:tracking-[0.14em]">
				<TemplateSelector compact={true} />
			</div>
		{/if}
		{#if showLanguageSelector}
			<LanguageSelector compact={true} />
		{/if}
		{#if showThemeToggle}
			<button
				type="button"
				class="noir-mode-btn"
				on:click={toggleTheme}
				aria-label="Toggle light or dark theme"
			>
				{$resolvedTheme === 'dark' ? 'light' : 'dark'}
			</button>
		{/if}
	</nav>
</header>

{#if (showMenu || showTemplateSelector || showLanguageSelector || showThemeToggle) && mobileMenuOpen}
	<div
		class="md:hidden fixed inset-x-0 top-[72px] z-[99] border-t px-6 py-4 space-y-4 transition-colors duration-300"
		style="font-family: var(--os-font-body); background: var(--tp-canvas); border-color: var(--tp-border); color: var(--tp-fg);"
		role="dialog"
		aria-label="Navigation"
	>
		{#if showMenu}
			<Menu
				config={$headerConfig}
				itemClass="block py-2 text-[10px] uppercase tracking-[0.18em] text-[color:var(--tp-fg-muted)]"
				activeItemClass="text-[color:var(--tp-fg)]"
				containerClass="flex flex-col gap-1"
				orientation="vertical"
				showActiveIndicator={false}
				showAuthButtons={false}
			/>
			{#if showAuthButtons && $auth.authenticated && $auth.user}
				<div class="pt-2 border-t flex flex-col gap-2" style="border-color: var(--tp-border);">
					<NotificationNavLink linkClass="relative inline-block py-2 text-[10px] uppercase tracking-[0.18em]" />
					{#if showGreeting}
						<span class="text-[9px]" style="color: var(--tp-fg-muted);">{$auth.user.name || $auth.user.email}</span>
					{/if}
					<button
						type="button"
						class="text-start text-[10px] uppercase tracking-[0.18em] py-2"
						on:click={() => {
							closeMobileMenu();
							handleLogout();
						}}
					>
						{$t('header.logout')}
					</button>
				</div>
			{/if}
		{/if}
		<div class="flex flex-wrap gap-4 pt-2 border-t" style="border-color: var(--tp-border);">
			{#if showTemplateSelector}
				<TemplateSelector compact={true} />
			{/if}
			{#if showLanguageSelector}
				<LanguageSelector compact={true} />
			{/if}
			{#if showThemeToggle}
				<button
					type="button"
					class="noir-mode-btn"
					on:click={toggleTheme}
					aria-label="Toggle light or dark theme"
				>
					{$resolvedTheme === 'dark' ? 'light' : 'dark'}
				</button>
			{/if}
		</div>
	</div>
{/if}

<style>
	.noir-mode-btn {
		background: none;
		border: 1px solid var(--tp-border);
		color: var(--tp-fg-muted);
		font-family: var(--os-font-body);
		font-size: 10px;
		letter-spacing: 0.14em;
		text-transform: uppercase;
		padding: 5px 12px;
		cursor: pointer;
		transition: color 0.2s, border-color 0.2s;
	}
	.noir-mode-btn:hover {
		color: var(--tp-fg);
		border-color: var(--tp-fg-muted);
	}
</style>
