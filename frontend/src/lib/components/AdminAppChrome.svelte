<script lang="ts">
	import '$lib/styles/admin.css';
	import { onMount, onDestroy } from 'svelte';
	import type { Snippet } from 'svelte';
	import { page } from '$app/stores';
	import { browser } from '$app/environment';
	import { get } from 'svelte/store';
	import AdminToastRegion from '$lib/components/admin/AdminToastRegion.svelte';
	import AdminSidebar from '$lib/components/admin/AdminSidebar.svelte';
	import { applyHtmlThemeClass, getResolvedSiteThemeFromStore } from '$lib/stores/theme';
	import { adminUiColorMode, toggleAdminUiColorMode } from '$lib/stores/admin-ui-theme';
	import { siteConfigData, productName } from '$stores/siteConfig';
	import { currentLanguage, setLanguage } from '$stores/language';
	import { SUPPORTED_LANGUAGES, type LanguageCode } from '$types/multi-lang';
	import { adminSelectSmClass } from '$lib/admin/admin-cerberus';
	import { t } from '$stores/i18n';

	let { children }: { children: Snippet } = $props();

	const colorModeBtnClass =
		'btn btn-sm preset-outlined-surface-200-800 inline-flex items-center justify-center p-2 min-w-[2.25rem]';

	let uiDebugMetrics = $state({
		zoomPct: 100,
		rootFontSize: '16px',
		dpr: 1
	});
	let savedSiteColorMode = $state<'light' | 'dark' | null>(null);
	let mobileNavOpen = $state(false);

	const hideOs = $derived(!!$siteConfigData?.whiteLabel?.hideOpenShutterBranding);
	const brand = $derived(hideOs ? $t('admin.chromeBrandShort') : $t('admin.chromeBrandLong'));
	const chromeHeading = $derived(
		$t('admin.chromeHeading').replace('{brand}', brand).replace('{site}', $productName)
	);
	const activeLanguages = $derived($siteConfigData?.languages?.activeLanguages);
	const adminUiLanguages = $derived(
		activeLanguages?.length
			? SUPPORTED_LANGUAGES.filter((lang) => activeLanguages.includes(lang.code))
			: []
	);
	const showAdminLangSwitch = $derived(adminUiLanguages.length > 1);
	const showUiDebug = $derived(browser && $page.url.searchParams.get('uiDebug') === '1');

	$effect(() => {
		if (!browser || adminUiLanguages.length === 0) return;
		const lang = get(currentLanguage);
		const ok = adminUiLanguages.some((l) => l.code === lang);
		if (!ok) {
			const def = get(siteConfigData)?.languages?.defaultLanguage;
			const next =
				def && adminUiLanguages.some((l) => l.code === def) ? def : adminUiLanguages[0].code;
			setLanguage(next as LanguageCode);
		}
	});

	$effect(() => {
		if (!browser) return;
		document.body.style.setProperty(
			'color-scheme',
			get(adminUiColorMode) === 'dark' ? 'dark' : 'light'
		);
	});

	onMount(() => {
		if (!browser) return;
		savedSiteColorMode = getResolvedSiteThemeFromStore();
		applyHtmlThemeClass('light');

		const refreshUiDebugMetrics = () => {
			const vvScale = window.visualViewport?.scale ?? 1;
			uiDebugMetrics = {
				zoomPct: Math.round((1 / vvScale) * 100),
				rootFontSize: getComputedStyle(document.documentElement).fontSize,
				dpr: Number(window.devicePixelRatio || 1)
			};
		};
		refreshUiDebugMetrics();
		window.addEventListener('resize', refreshUiDebugMetrics);
		window.visualViewport?.addEventListener('resize', refreshUiDebugMetrics);
		window.visualViewport?.addEventListener('scroll', refreshUiDebugMetrics);

		return () => {
			window.removeEventListener('resize', refreshUiDebugMetrics);
			window.visualViewport?.removeEventListener('resize', refreshUiDebugMetrics);
			window.visualViewport?.removeEventListener('scroll', refreshUiDebugMetrics);
		};
	});

	onDestroy(() => {
		if (!browser) return;
		document.body.style.removeProperty('color-scheme');
		if (savedSiteColorMode !== null) {
			applyHtmlThemeClass(savedSiteColorMode);
			savedSiteColorMode = null;
		}
	});
</script>

<main
	class="min-h-screen antialiased bg-(--body-background-color) text-(--base-font-color) dark:bg-(--body-background-color-dark) dark:text-(--base-font-color-dark) {$adminUiColorMode === 'dark'
		? '[color-scheme:dark]'
		: '[color-scheme:light]'}"
	class:dark={$adminUiColorMode === 'dark'}
	data-admin-chrome
	data-theme="cerberus"
>
	<div class="w-full max-w-[min(100vw-0px,96rem)] mx-auto px-[var(--os-padding)] box-border">
		<header
			class="border-b border-[color:color-mix(in_oklab,var(--color-surface-950)_12%,transparent)] dark:border-[color:color-mix(in_oklab,var(--color-surface-50)_14%,transparent)] py-2.5 mb-4"
			aria-label={chromeHeading}
		>
			<div class="flex flex-nowrap items-center justify-between gap-2 sm:gap-3 min-w-0">
				<div class="flex items-center gap-2 min-w-0 shrink lg:min-w-0">
					<button
						type="button"
						class="{colorModeBtnClass} lg:hidden"
						onclick={() => (mobileNavOpen = true)}
						aria-expanded={mobileNavOpen}
						aria-controls="admin-sidebar-nav"
						title={$t('admin.sidebarOpenMenu')}
						aria-label={$t('admin.sidebarOpenMenu')}
					>
						<svg class="w-5 h-5 shrink-0" fill="none" stroke="currentColor" viewBox="0 0 24 24" aria-hidden="true">
							<path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M4 6h16M4 12h16M4 18h16" />
						</svg>
					</button>
					<p
						class="text-sm font-medium text-(--heading-font-color) dark:text-(--heading-font-color-dark) truncate lg:hidden max-w-[min(100%,14rem)] sm:max-w-[20rem]"
					>
						{chromeHeading}
					</p>
				</div>
				<nav class="flex flex-nowrap items-center gap-1.5 sm:gap-2 shrink-0" aria-label={$t('admin.chromeNavAria')}>
					<button
						type="button"
						class={colorModeBtnClass}
						onclick={toggleAdminUiColorMode}
						title={$t('admin.chromeColorModeTitle')}
						aria-label={$t('admin.chromeColorModeAria')}
						aria-pressed={$adminUiColorMode === 'dark'}
					>
						{#if $adminUiColorMode === 'dark'}
							<svg class="w-5 h-5 shrink-0" fill="none" stroke="currentColor" viewBox="0 0 24 24" aria-hidden="true">
								<path
									stroke-linecap="round"
									stroke-linejoin="round"
									stroke-width="2"
									d="M12 3v1m0 16v1m9-9h-1M4 12H3m15.364 6.364l-.707-.707M6.343 6.343l-.707-.707m12.728 0l-.707.707M6.343 17.657l-.707.707M16 12a4 4 0 11-8 0 4 4 0 018 0z"
								/>
							</svg>
						{:else}
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
							onchange={(e) => setLanguage(e.currentTarget.value as LanguageCode)}
							title={$t('admin.chromeLanguageAria')}
						>
							{#each adminUiLanguages as lang}
								<option value={lang.code}>{lang.nativeName}</option>
							{/each}
						</select>
					{/if}
				</nav>
			</div>
		</header>
		<div class="flex flex-col lg:flex-row lg:items-stretch gap-0 lg:gap-6 pb-10">
			<AdminSidebar bind:mobileOpen={mobileNavOpen} heading={chromeHeading} />
			<div class="flex-1 min-w-0 min-h-0">
				{@render children()}
			</div>
		</div>
	</div>
	<AdminToastRegion />
	{#if showUiDebug}
		<div
			class="fixed bottom-2 right-2 z-50 rounded border border-surface-300-700 bg-surface-50-950 px-2 py-1 text-[11px] font-mono text-(--color-surface-800-200) shadow"
		>
			zoom {uiDebugMetrics.zoomPct}% | root {uiDebugMetrics.rootFontSize} | dpr {uiDebugMetrics.dpr.toFixed(2)}
		</div>
	{/if}
</main>
