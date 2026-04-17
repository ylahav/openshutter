<script lang="ts">
	import { onMount, onDestroy } from 'svelte';
	import { page } from '$app/stores';
	import { browser } from '$app/environment';
	import AdminToastRegion from '$lib/components/admin/AdminToastRegion.svelte';
	import { logout } from '$lib/stores/auth';
	import { applyHtmlThemeClass, getResolvedSiteThemeFromStore } from '$lib/stores/theme';
	import { adminUiColorMode, toggleAdminUiColorMode } from '$lib/stores/admin-ui-theme';
	import { siteConfigData, productName } from '$stores/siteConfig';
	import { currentLanguage, setLanguage } from '$stores/language';
	import { SUPPORTED_LANGUAGES, type LanguageCode } from '$types/multi-lang';
	import { adminSelectSmClass } from '$lib/admin/admin-cerberus';
	import { t } from '$stores/i18n';

	async function handleLogout() {
		await logout();
	}

	$: hideOs = !!$siteConfigData?.whiteLabel?.hideOpenShutterBranding;
	$: brand = hideOs ? $t('admin.chromeBrandShort') : $t('admin.chromeBrandLong');
	$: chromeHeading = $t('admin.chromeHeading')
		.replace('{brand}', brand)
		.replace('{site}', $productName);

	/** Same rule as `LanguageSelector`: enabled site languages only (omit control until config is known). */
	$: activeLanguages = $siteConfigData?.languages?.activeLanguages;
	$: adminUiLanguages = activeLanguages?.length
		? SUPPORTED_LANGUAGES.filter((lang) => activeLanguages.includes(lang.code))
		: [];
	$: showAdminLangSwitch = adminUiLanguages.length > 1;

	/** If the stored UI language was removed from site config, snap to default or first active. */
	$: if (browser && adminUiLanguages.length > 0) {
		const ok = adminUiLanguages.some((l) => l.code === $currentLanguage);
		if (!ok) {
			const def = $siteConfigData?.languages?.defaultLanguage;
			const next =
				def && adminUiLanguages.some((l) => l.code === def)
					? def
					: adminUiLanguages[0].code;
			setLanguage(next as LanguageCode);
		}
	}

	const navLinkClass = 'btn btn-sm preset-outlined-surface-200-800';
	const logoutClass = 'btn btn-sm preset-filled-error-500';
	/** Outlined like nav links — `preset-tonal` + `light-dark()` broke when `color-scheme` did not match admin dark UI. */
	const colorModeBtnClass =
		'btn btn-sm preset-outlined-surface-200-800 inline-flex items-center justify-center p-2 min-w-[2.25rem]';

	/** Snapshot site `<html>` theme so we can restore it when leaving admin. */
	let savedSiteColorMode: 'light' | 'dark' | null = null;

	onMount(() => {
		if (!browser) return;
		savedSiteColorMode = getResolvedSiteThemeFromStore();
		// Admin defaults to light on the document root; dark mode uses `class="dark"` on this `<main>` only.
		applyHtmlThemeClass('light');
	});

	onDestroy(() => {
		if (!browser) return;
		document.body.style.removeProperty('color-scheme');
		if (savedSiteColorMode !== null) {
			applyHtmlThemeClass(savedSiteColorMode);
			savedSiteColorMode = null;
		}
	});

	// Skeleton `light-dark()` tokens (e.g. `preset-filled`, `preset-tonal`) follow **used color-scheme**, not Tailwind `dark:`.
	// Keep `html` without `.dark` for the public theme, but set scheme on `body` so admin + portaled dialogs/toasts resolve tokens correctly.
	$: if (browser) {
		document.body.style.setProperty(
			'color-scheme',
			$adminUiColorMode === 'dark' ? 'dark' : 'light',
		);
	}
</script>

<!-- Cerberus CSS variables are defined on this node; body on public routes stays unchanged. -->
<main
	class="min-h-screen antialiased bg-(--body-background-color) text-(--base-font-color) dark:bg-(--body-background-color-dark) dark:text-(--base-font-color-dark) {$adminUiColorMode === 'dark'
		? '[color-scheme:dark]'
		: '[color-scheme:light]'}"
	class:dark={$adminUiColorMode === 'dark'}
	data-admin-chrome
	data-theme="cerberus"
>
	<div class="os-shell-container max-w-(--os-max-width)">
		<header
			class="border-b border-[color:color-mix(in_oklab,var(--color-surface-950)_12%,transparent)] dark:border-[color:color-mix(in_oklab,var(--color-surface-50)_14%,transparent)] pt-4 pb-3 mb-6"
			aria-label={chromeHeading}
		>
			<div class="flex flex-nowrap items-center justify-between gap-2 sm:gap-3 min-w-0">
				<h1
					class="text-base sm:text-lg font-semibold text-(--heading-font-color) dark:text-(--heading-font-color-dark) tracking-tight min-w-0 flex-1 truncate pr-2"
				>
					{chromeHeading}
				</h1>
				<nav class="flex flex-nowrap items-center gap-1.5 sm:gap-2 shrink-0" aria-label={$t('admin.chromeNavAria')}>
					<button
						type="button"
						class={colorModeBtnClass}
						on:click={toggleAdminUiColorMode}
						title={$t('admin.chromeColorModeTitle')}
						aria-label={$t('admin.chromeColorModeAria')}
						aria-pressed={$adminUiColorMode === 'dark'}
					>
						{#if $adminUiColorMode === 'dark'}
							<!-- Sun: switch to light -->
							<svg class="w-5 h-5 shrink-0" fill="none" stroke="currentColor" viewBox="0 0 24 24" aria-hidden="true">
								<path
									stroke-linecap="round"
									stroke-linejoin="round"
									stroke-width="2"
									d="M12 3v1m0 16v1m9-9h-1M4 12H3m15.364 6.364l-.707-.707M6.343 6.343l-.707-.707m12.728 0l-.707.707M6.343 17.657l-.707.707M16 12a4 4 0 11-8 0 4 4 0 018 0z"
								/>
							</svg>
						{:else}
							<!-- Moon: switch to dark -->
							<svg class="w-5 h-5 shrink-0" fill="none" stroke="currentColor" viewBox="0 0 24 24" aria-hidden="true">
								<path
									stroke-linecap="round"
									stroke-linejoin="round"
									stroke-width="2"
									d="M20.354 15.354A9 9 0 018.646 3.646 9.003 9.003 0 0012 21a9.003 9.003 0 008.354-5.646z"
								/>
							</svg>
						{/if}
					</button>
					{#if showAdminLangSwitch}
						<label for="admin-chrome-lang" class="sr-only">{$t('admin.chromeLanguageAria')}</label>
						<select
							id="admin-chrome-lang"
							class={`${adminSelectSmClass} !w-auto max-w-[6.25rem] sm:max-w-[7rem] shrink-0`}
							value={$currentLanguage}
							on:change={(e) => setLanguage(e.currentTarget.value as LanguageCode)}
							title={$t('admin.chromeLanguageAria')}
						>
							{#each adminUiLanguages as lang}
								<option value={lang.code}>{lang.nativeName}</option>
							{/each}
						</select>
					{/if}
					<a href="/" class={navLinkClass}>
						{$t('admin.chromeNavSite')}
					</a>
					<a
						href="/admin"
						class={navLinkClass}
						aria-current={$page.url.pathname === '/admin' ? 'page' : undefined}
					>
						{$t('admin.chromeNavAdmin')}
					</a>
					<button type="button" class={logoutClass} on:click={handleLogout}>
						{$t('header.logout')}
					</button>
				</nav>
			</div>
		</header>
		<slot />
	</div>
	<AdminToastRegion />
</main>
