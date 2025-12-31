<script lang="ts">
	import { onMount } from 'svelte';
	import { derived } from 'svelte/store';
	import { currentLanguage } from '$stores/language';
	import { siteConfigData, siteConfig } from '$stores/siteConfig';
	import { auth, logout } from '$lib/stores/auth';
	import { MultiLangUtils } from '$utils/multiLang';
	import LanguageSelector from '$components/LanguageSelector.svelte';
	import { t } from '$stores/i18n';

	const year = new Date().getFullYear();

	const title = derived(
		[siteConfigData, currentLanguage],
		([$config, $lang]) =>
			$config?.title ? MultiLangUtils.getTextValue($config.title, $lang) : 'OpenShutter'
	);

	const logo = derived(siteConfigData, ($config) => $config?.logo ?? '');

	// Refresh site config when header mounts to ensure language selector has latest data
	onMount(() => {
		// Only refresh if config is not loading and we're not on login page
		if (typeof window !== 'undefined' && window.location.pathname !== '/login') {
			siteConfig.load().catch(() => {
				// Silently fail - config refresh is not critical
			});
		}
	});

	async function handleLogout() {
		await logout();
	}
</script>

<header class="bg-white shadow-sm border-b border-gray-200">
	<div class="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
		<div class="flex justify-between items-center h-16">
			<!-- Logo and title -->
			<div class="flex items-center space-x-3">
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

				<div class="flex flex-col">
					<a href="/" class="text-xl font-bold text-gray-900 hover:text-primary-600 transition-colors">
						{$title}
					</a>
				</div>
			</div>

			<!-- Simple nav placeholder (we'll enhance later) -->
			<nav class="hidden md:flex items-center gap-4 text-sm text-gray-600">
				<a href="/" class="hover:text-gray-900">{$t('navigation.home')}</a>
				<a href="/albums" class="hover:text-gray-900">{$t('navigation.albums')}</a>
				<a href="/search" class="hover:text-gray-900">{$t('navigation.search')}</a>

				{#if $auth.authenticated && $auth.user}
					{#if $auth.user.role === 'admin'}
						<a href="/admin" class="hover:text-gray-900 font-medium text-primary-600">{$t('navigation.admin')}</a>
					{:else if $auth.user.role === 'owner'}
						<a href="/owner" class="hover:text-gray-900 font-medium text-primary-600">{$t('header.myGallery')}</a>
					{/if}
					<span class="text-gray-400">|</span>
					<span class="text-gray-500">{$auth.user.name || $auth.user.email}</span>
					<button
						on:click={handleLogout}
						class="hover:text-gray-900 text-gray-600"
						type="button"
					>
						{$t('header.logout')}
					</button>
				{:else}
					<a href="/login" class="hover:text-gray-900">{$t('auth.signIn')}</a>
				{/if}

				<!-- Language selector on the right -->
				<div class="ml-6">
					<LanguageSelector compact={true} />
				</div>
			</nav>
		</div>
	</div>
</header>
