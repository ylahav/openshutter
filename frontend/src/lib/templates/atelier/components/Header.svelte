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
	} = resolveHeaderVisibilityForPack('atelier', $headerConfig));

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
</script>

<header
	class="sticky top-0 z-[100] relative text-center border-b transition-colors duration-300 pt-7 pb-5 px-8 bg-[color:var(--tp-surface-1)] border-[color:var(--tp-border)]"
	style="font-family: var(--os-font-body);"
>
	<div class="absolute top-7 right-8 flex flex-wrap items-center justify-end gap-2 z-10">
		{#if showAuthButtons && !$auth.authenticated}
			<a
				href="/login"
				class="text-[10px] uppercase tracking-[0.16em] px-3 py-1.5 border no-underline transition-colors"
				style="color: var(--tp-fg-muted); border-color: var(--tp-border);"
			>
				{$t('auth.signIn')}
			</a>
		{/if}
		{#if showAuthButtons && $auth.authenticated && $auth.user}
			{#if showGreeting}
				<span class="text-[10px] tracking-wide max-w-[120px] truncate" style="color: var(--tp-fg-muted);">
					{$auth.user.name || $auth.user.email}
				</span>
			{/if}
			<button
				type="button"
				class="text-[10px] uppercase tracking-[0.16em] px-2"
				style="color: var(--tp-fg-muted);"
				on:click={handleLogout}
			>
				{$t('header.logout')}
			</button>
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

	<a href="/" class="block no-underline">
		{#if showLogo && $logo}
			<img src={$logo} alt={$title} class="mx-auto h-12 w-auto object-contain mb-1" />
		{:else if showSiteTitle}
			<span
				class="block text-[28px] tracking-[0.12em] text-[color:var(--tp-fg)]"
				style="font-family: var(--os-font-heading); font-weight: 400;"
			>
				{$title}
			</span>
		{:else}
			<span class="block text-[28px] tracking-[0.12em] text-[color:var(--tp-fg)]" style="font-family: var(--os-font-heading);">
				{$title}
			</span>
		{/if}
	</a>

	<p class="text-[10px] uppercase tracking-[0.32em] mt-1" style="color: var(--tp-fg-muted);">
		{$t('albums.gallerySubtitle')}
	</p>

	<div class="w-9 h-px mx-auto my-3.5" style="background: var(--os-primary);"></div>

	<button
		type="button"
		class="md:hidden text-[10px] uppercase tracking-[0.2em] mb-3"
		style="color: var(--tp-fg-muted);"
		aria-expanded={mobileMenuOpen}
		on:click={() => (mobileMenuOpen = !mobileMenuOpen)}
	>
		{mobileMenuOpen ? 'Close' : 'Menu'}
	</button>

	<nav class="hidden md:flex justify-center gap-8 flex-wrap">
		{#if showMenu}
			<Menu
				config={$headerConfig}
				itemClass="text-[10px] uppercase tracking-[0.22em] no-underline transition-colors text-[color:var(--tp-fg-muted)] hover:text-[color:var(--tp-fg)]"
				activeItemClass="!text-[color:var(--os-primary)]"
				containerClass="flex items-center justify-center gap-8 flex-wrap"
				showActiveIndicator={false}
				showAuthButtons={false}
			/>
		{/if}
	</nav>
</header>

{#if showMenu && mobileMenuOpen}
	<div
		class="md:hidden border-b px-6 py-4 space-y-3"
		style="background: var(--tp-surface-1); border-color: var(--tp-border); color: var(--tp-fg);"
	>
		<Menu
			config={$headerConfig}
			itemClass="block py-2 text-[10px] uppercase tracking-[0.22em]"
			activeItemClass="!text-[color:var(--os-primary)]"
			containerClass="flex flex-col gap-1"
			orientation="vertical"
			showActiveIndicator={false}
			showAuthButtons={showAuthButtons}
		/>
		{#if showAuthButtons && $auth.authenticated}
			<div class="pt-2 border-t flex flex-col gap-2" style="border-color: var(--tp-border);">
				<NotificationNavLink linkClass="text-[10px] uppercase tracking-[0.18em]" />
			</div>
		{/if}
	</div>
{/if}
