<script lang="ts">
	import { onMount } from 'svelte';
	import type { PageData } from './$types';
	import { logout } from '$lib/stores/auth';
	import { productName } from '$stores/siteConfig';
	import { t } from '$stores/i18n';

	let { data }: { data: PageData } = $props();

	/** Show Storage management: own profile storage, or dedicated per-owner storage (admin flag). */
	let showStorageManagementCard = $state(false);
	let profileLoaded = $state(false);

	onMount(async () => {
		try {
			const res = await fetch('/api/auth/profile');
			if (res.ok) {
				const json = await res.json();
				const user = json.user || json;
				const notUsingMainSiteStorage = user?.storageConfig?.useAdminConfig !== true;
				const dedicated = user?.useDedicatedStorage === true;
				showStorageManagementCard = notUsingMainSiteStorage || dedicated;
			}
		} catch (_) {
			// Non-fatal; keep card hidden if we can't load profile
		} finally {
			profileLoaded = true;
		}
	});

	async function handleLogout() {
		await logout();
	}
</script>

<svelte:head>
	<title>{$t('owner.ownerPanel')} - {$productName}</title>
</svelte:head>

<div class="min-h-screen bg-gray-50 py-8">
	<div class="max-w-6xl mx-auto px-4">
		<div class="flex justify-between items-center mb-8">
			<div>
				<h1 class="text-3xl font-bold text-gray-900">{$t('owner.ownerPanel')}</h1>
				<p class="text-gray-600 mt-2">{$t('owner.manageYourAlbums')}</p>
			</div>
			<div class="flex space-x-3">
				<a
					href="/"
					class="inline-flex items-center px-4 py-2 bg-blue-600 text-white rounded-md hover:bg-blue-700"
				>
					<svg class="w-4 h-4 mr-2" fill="none" stroke="currentColor" viewBox="0 0 24 24">
						<path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M3 12l2-2m0 0l7-7 7 7M5 10v10a1 1 0 001 1h3m10-11l2 2m-2-2v10a1 1 0 01-1 1h-3m-6 0a1 1 0 001-1v-4a1 1 0 011-1h2a1 1 0 011 1v4a1 1 0 001 1m-6 0h6" />
					</svg>
					{$t('navigation.home')}
				</a>
				<button
					onclick={handleLogout}
					class="inline-flex items-center px-4 py-2 bg-red-600 text-white rounded-md hover:bg-red-700"
				>
					<svg class="w-4 h-4 mr-2" fill="none" stroke="currentColor" viewBox="0 0 24 24">
						<path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M17 16l4-4m0 0l-4-4m4 4H7m6 4v1a3 3 0 01-3 3H6a3 3 0 01-3-3V7a3 3 0 013-3h4a3 3 0 013 3v1" />
					</svg>
					{$t('header.logout')}
				</button>
			</div>
		</div>

		<div class="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
			<!-- Profile -->
			<div class="bg-white rounded-lg shadow-md p-6">
				<div class="flex items-center mb-4">
					<div class="w-10 h-10 bg-blue-100 rounded-lg flex items-center justify-center">
						<svg class="w-6 h-6 text-blue-600" fill="none" stroke="currentColor" viewBox="0 0 24 24">
							<path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M16 7a4 4 0 11-8 0 4 4 0 018 0zM12 14a7 7 0 00-7 7h14a7 7 0 00-7-7z" />
						</svg>
					</div>
					<h2 class="text-xl font-semibold text-gray-900 ml-3">{$t('owner.profileManagement')}</h2>
				</div>
				<p class="text-gray-600 mb-4">{$t('owner.editProfileDescription')}</p>
				<a href="/owner/profile" class="inline-flex items-center px-4 py-2 bg-blue-600 text-white rounded-md hover:bg-blue-700">
					{$t('owner.editProfile')}
					<svg class="ml-2 w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M9 5l7 7-7 7" /></svg>
				</a>
			</div>

			<!-- Site settings -->
			<div class="bg-white rounded-lg shadow-md p-6">
				<div class="flex items-center mb-4">
					<div class="w-10 h-10 bg-indigo-100 rounded-lg flex items-center justify-center">
						<svg class="w-6 h-6 text-indigo-600" fill="none" stroke="currentColor" viewBox="0 0 24 24">
							<path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M21 12a9 9 0 01-9 9m9-9a9 9 0 00-9-9m9 9H3m9 9a9 9 0 01-9-9m9 9c1.657 0 3-4.03 3-9s-1.343-9-3-9m0 18c-1.657 0-3-4.03-3-9s1.343-9 3-9m-9 9a9 9 0 019-9" />
						</svg>
					</div>
					<h2 class="text-xl font-semibold text-gray-900 ml-3">{$t('owner.siteSettings')}</h2>
				</div>
				<p class="text-gray-600 mb-4">{$t('owner.siteSettingsDescription')}</p>
				<a href="/owner/site-settings" class="inline-flex items-center px-4 py-2 bg-indigo-600 text-white rounded-md hover:bg-indigo-700">
					{$t('owner.siteSettingsButton')}
					<svg class="ml-2 w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M9 5l7 7-7 7" /></svg>
				</a>
			</div>

			<!-- Theme -->
			<div class="bg-white rounded-lg shadow-md p-6">
				<div class="flex items-center mb-4">
					<div class="w-10 h-10 bg-amber-100 rounded-lg flex items-center justify-center">
						<svg class="w-6 h-6 text-amber-600" fill="none" stroke="currentColor" viewBox="0 0 24 24">
							<path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M4 5a1 1 0 011-1h14a1 1 0 011 1v2a1 1 0 01-1 1H5a1 1 0 01-1-1V5zM4 13a1 1 0 011-1h6a1 1 0 011 1v6a1 1 0 01-1 1H5a1 1 0 01-1-1v-6zM16 13a1 1 0 011-1h2a1 1 0 011 1v6a1 1 0 01-1 1h-2a1 1 0 01-1-1v-6z" />
						</svg>
					</div>
					<h2 class="text-xl font-semibold text-gray-900 ml-3">{$t('owner.theme')}</h2>
				</div>
				<p class="text-gray-600 mb-4">{$t('owner.themeDescription')}</p>
				<a href="/owner/theme" class="inline-flex items-center px-4 py-2 bg-amber-600 text-white rounded-md hover:bg-amber-700">
					{$t('owner.layoutAndMenu')}
					<svg class="ml-2 w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M9 5l7 7-7 7" /></svg>
				</a>
			</div>

			<!-- Albums -->
			<div class="bg-white rounded-lg shadow-md p-6">
				<div class="flex items-center mb-4">
					<div class="w-10 h-10 bg-purple-100 rounded-lg flex items-center justify-center">
						<svg class="w-6 h-6 text-purple-600" fill="none" stroke="currentColor" viewBox="0 0 24 24">
							<path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M19 11H5m14 0a2 2 0 012 2v6a2 2 0 01-2 2H5a2 2 0 01-2-2v-6a2 2 0 012-2m14 0V9a2 2 0 00-2-2M5 11V9a2 2 0 012-2m0 0V5a2 2 0 012-2h6a2 2 0 012 2v2M7 7h10" />
						</svg>
					</div>
					<h2 class="text-xl font-semibold text-gray-900 ml-3">{$t('owner.myAlbums')}</h2>
				</div>
				<p class="text-gray-600 mb-4">{$t('owner.createEditMyAlbums')}</p>
				<a href="/owner/albums" class="inline-flex items-center px-4 py-2 bg-purple-600 text-white rounded-md hover:bg-purple-700">
					{$t('owner.manageMyAlbums')}
					<svg class="ml-2 w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M9 5l7 7-7 7" /></svg>
				</a>
			</div>

			<!-- Blog -->
			<div class="bg-white rounded-lg shadow-md p-6">
				<div class="flex items-center mb-4">
					<div class="w-10 h-10 bg-green-100 rounded-lg flex items-center justify-center">
						<svg class="w-6 h-6 text-green-600" fill="none" stroke="currentColor" viewBox="0 0 24 24">
							<path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M19 20H5a2 2 0 01-2-2V6a2 2 0 012-2h10a2 2 0 012 2v1m2 13a2 2 0 01-2-2V7m2 13a2 2 0 002-2V9a2 2 0 00-2-2h-2m-4-3H9M7 16h6M7 8h6v4H7V8z" />
						</svg>
					</div>
					<h2 class="text-xl font-semibold text-gray-900 ml-3">{$t('owner.blogManagement')}</h2>
				</div>
				<p class="text-gray-600 mb-4">{$t('owner.createEditBlogArticles')}</p>
				<a href="/owner/blog" class="inline-flex items-center px-4 py-2 bg-green-600 text-white rounded-md hover:bg-green-700">
					{$t('owner.manageBlog')}
					<svg class="ml-2 w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M9 5l7 7-7 7" /></svg>
				</a>
			</div>

			<!-- Search insights -->
			<div class="bg-white rounded-lg shadow-md p-6">
				<div class="flex items-center mb-4">
					<div class="w-10 h-10 bg-teal-100 rounded-lg flex items-center justify-center">
						<svg class="w-6 h-6 text-teal-600" fill="none" stroke="currentColor" viewBox="0 0 24 24">
							<path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M21 21l-6-6m2-5a7 7 0 11-14 0 7 7 0 0114 0z" />
						</svg>
					</div>
					<h2 class="text-xl font-semibold text-gray-900 ml-3">{$t('owner.searchInsightsTitle')}</h2>
				</div>
				<p class="text-gray-600 mb-4">{$t('owner.searchInsightsDescription')}</p>
				<a href="/owner/analytics" class="inline-flex items-center px-4 py-2 bg-teal-600 text-white rounded-md hover:bg-teal-700">
					{$t('owner.viewSearchInsights')}
					<svg class="ml-2 w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M9 5l7 7-7 7" /></svg>
				</a>
			</div>

			<!-- Storage (conditional) -->
			{#if profileLoaded && showStorageManagementCard}
				<div class="bg-white rounded-lg shadow-md p-6" data-testid="owner-dashboard-storage-card">
					<div class="flex items-center mb-4">
						<div class="w-10 h-10 bg-green-100 rounded-lg flex items-center justify-center">
							<svg class="w-6 h-6 text-green-600" fill="none" stroke="currentColor" viewBox="0 0 24 24">
								<path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M4 7v10c0 2.21 3.582 4 8 4s8-1.79 8-4V7M4 7c0 2.21 3.582 4 8 4s8-1.79 8-4M4 7c0-2.21 3.582-4 8-4s8 1.79 8 4m0 5c0 2.21-3.582 4-8 4s-8-1.79-8-4" />
							</svg>
						</div>
						<h2 class="text-xl font-semibold text-gray-900 ml-3">{$t('owner.storageManagement')}</h2>
					</div>
					<p class="text-gray-600 mb-4">{$t('owner.storageManagementDescription')}</p>
					<a href="/owner/storage" class="inline-flex items-center px-4 py-2 bg-green-600 text-white rounded-md hover:bg-green-700" data-testid="owner-dashboard-storage-link">
						{$t('owner.manageStorage')}
						<svg class="ml-2 w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M9 5l7 7-7 7" /></svg>
					</a>
				</div>
			{/if}

			<!-- Developers -->
			<div class="bg-white rounded-lg shadow-md p-6">
				<div class="flex items-center mb-4">
					<div class="w-10 h-10 bg-amber-100 rounded-lg flex items-center justify-center">
						<svg class="w-6 h-6 text-amber-600" fill="none" stroke="currentColor" viewBox="0 0 24 24">
							<path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M15 7a2 2 0 012 2m4 0a6 6 0 01-7.743 5.743L11 17H9v2H7v2H4a1 1 0 01-1-1v-2.586a1 1 0 01.293-.707l5.964-5.964A6 6 0 1121 9z" />
						</svg>
					</div>
					<h2 class="text-xl font-semibold text-gray-900 ml-3">{$t('owner.developers')}</h2>
				</div>
				<p class="text-gray-600 mb-4">{$t('owner.developerApiDescription')}</p>
				<a href="/developers" class="inline-flex items-center px-4 py-2 bg-amber-600 text-white rounded-md hover:bg-amber-700">
					{$t('owner.developerPortal')}
					<svg class="ml-2 w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M9 5l7 7-7 7" /></svg>
				</a>
			</div>
		</div>
	</div>
</div>
