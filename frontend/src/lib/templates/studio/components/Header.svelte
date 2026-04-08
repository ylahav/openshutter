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
	import ThemeToggle from '$components/ThemeToggle.svelte';
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
	} = resolveHeaderVisibilityForPack('studio', $headerConfig));

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

	function initials(name: string): string {
		const parts = name.trim().split(/\s+/).filter(Boolean);
		if (parts.length === 0) return '·';
		if (parts.length === 1) return parts[0].slice(0, 2).toUpperCase();
		return (parts[0][0] + parts[parts.length - 1][0]).toUpperCase();
	}
</script>

<header
	class="sticky top-0 z-[100] border-b transition-colors duration-300 bg-[color:var(--tp-surface-1)] border-[color:var(--tp-border)]"
	style="font-family: var(--os-font-body);"
>
	<div class="max-w-[var(--os-max-width)] mx-auto px-6 lg:px-7 h-[60px] flex items-center justify-between gap-6">
		<a href="/" class="flex items-center gap-2.5 no-underline shrink-0 min-w-0">
			{#if showLogo && $logo}
				<img src={$logo} alt={$title} class="h-8 w-auto object-contain rounded-lg" />
			{:else if showSiteTitle}
				<div
					class="w-8 h-8 rounded-lg flex items-center justify-center shrink-0 text-[14px] font-extrabold text-white"
					style="font-family: var(--os-font-heading); background: var(--os-primary, var(--color-primary-600));"
				>
					{initials($title)}
				</div>
				<span
					class="text-[16px] font-bold truncate"
					style="font-family: var(--os-font-heading); color: var(--tp-fg);"
				>
					{$title}
				</span>
			{:else}
				<span class="text-[16px] font-bold truncate" style="color: var(--tp-fg);">{$title}</span>
			{/if}
		</a>

		{#if showMenu || showTemplateSelector || showLanguageSelector || showThemeToggle}
			<button
				type="button"
				class="md:hidden text-[13px] font-medium px-2 py-1 rounded-md transition-colors"
				style="color: var(--tp-fg-muted);"
				aria-label="Menu"
				aria-expanded={mobileMenuOpen}
				on:click={toggleMobileMenu}
			>
				{mobileMenuOpen ? 'Close' : 'Menu'}
			</button>
		{/if}

		<nav class="hidden md:flex flex-1 justify-center items-center gap-1 min-w-0">
			{#if showMenu}
				<Menu
					config={$headerConfig}
					itemClass="text-[13px] font-medium px-3.5 py-1.5 rounded-md no-underline transition-colors text-[color:var(--tp-fg-muted)] hover:bg-[color:color-mix(in_srgb,var(--tp-fg)_6%,transparent)] hover:text-[color:var(--tp-fg)]"
					activeItemClass="!text-[color:var(--os-primary)] !bg-[color:color-mix(in_srgb,var(--os-primary)_12%,transparent)]"
					containerClass="flex items-center gap-1"
					showActiveIndicator={false}
					showAuthButtons={showAuthButtons}
				/>
			{/if}
		</nav>

		<div class="hidden md:flex items-center gap-2.5 shrink-0">
			{#if showAuthButtons && !$auth.authenticated}
				<a
					href="/login"
					class="inline-flex items-center justify-center text-[13px] font-medium px-4 py-1.5 rounded-md no-underline border transition-colors"
					style="color: var(--tp-fg-muted); border-color: var(--tp-border);"
				>
					{$t('auth.signIn')}
				</a>
			{/if}
			{#if showAuthButtons && $auth.authenticated && $auth.user}
				{#if showGreeting}
					<span class="text-[12px] max-w-[140px] truncate" style="color: var(--tp-fg-muted);">
						{$auth.user.name || $auth.user.email}
					</span>
				{/if}
				<button
					type="button"
					class="text-[13px] font-medium px-2 py-1 rounded-md transition-colors"
					style="color: var(--tp-fg-muted);"
					on:click={handleLogout}
				>
					{$t('header.logout')}
				</button>
			{/if}
			{#if showTemplateSelector}
				<div class="relative [&_button]:text-[12px]">
					<TemplateSelector compact={true} />
				</div>
			{/if}
			{#if showLanguageSelector}
				<LanguageSelector compact={true} />
			{/if}
			{#if showThemeToggle}
				<ThemeToggle />
			{/if}
		</div>
	</div>
</header>

{#if (showMenu || showTemplateSelector || showLanguageSelector || showThemeToggle) && mobileMenuOpen}
	<div
		class="md:hidden fixed inset-x-0 top-[60px] z-[99] border-t px-6 py-4 space-y-4 shadow-lg"
		style="font-family: var(--os-font-body); background: var(--tp-surface-1); border-color: var(--tp-border); color: var(--tp-fg);"
		role="dialog"
		aria-label="Navigation"
	>
		{#if showMenu}
			<Menu
				config={$headerConfig}
				itemClass="block py-2 text-[13px] font-medium rounded-md text-[color:var(--tp-fg-muted)]"
				activeItemClass="!text-[color:var(--os-primary)]"
				containerClass="flex flex-col gap-1"
				orientation="vertical"
				showActiveIndicator={false}
				showAuthButtons={showAuthButtons}
			/>
			{#if showAuthButtons && $auth.authenticated && $auth.user}
				<div class="pt-2 border-t flex flex-col gap-2" style="border-color: var(--tp-border);">
					<NotificationNavLink linkClass="relative inline-block py-2 text-[13px]" />
					<button
						type="button"
						class="text-start text-[13px] py-2"
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
			{#if showAuthButtons && !$auth.authenticated}
				<a href="/login" class="text-[13px] font-medium" on:click={closeMobileMenu}>{$t('auth.signIn')}</a>
			{/if}
			{#if showTemplateSelector}
				<TemplateSelector compact={true} />
			{/if}
			{#if showLanguageSelector}
				<LanguageSelector compact={true} />
			{/if}
			{#if showThemeToggle}
				<ThemeToggle />
			{/if}
		</div>
	</div>
{/if}
