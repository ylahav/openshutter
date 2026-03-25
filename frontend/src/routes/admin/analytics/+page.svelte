<script lang="ts">
	import { onMount } from 'svelte';
	import { t } from '$stores/i18n';
	import { getAlbumName } from '$lib/utils/albumUtils';
	import { logger } from '$lib/utils/logger';
	import { handleError, handleApiErrorResponse } from '$lib/utils/errorHandler';
	import LineChart from '$lib/components/analytics/LineChart.svelte';
	import BarChart from '$lib/components/analytics/BarChart.svelte';
	import PieChart from '$lib/components/analytics/PieChart.svelte';
	import type { PageData } from './$types';

	export let data: PageData;

	type Tab = 'overview' | 'views' | 'search' | 'tags' | 'albums' | 'storage';
	let activeTab: Tab = 'overview';
	type ProviderKey = 'google-vision' | 'clip' | 'local';
	interface AIProvidersHealthData {
		configuredProvider: string;
		autoOrder: ProviderKey[];
		activeProvider: ProviderKey | null;
		providers: Record<ProviderKey, { available: boolean; reason: string }>;
	}

	interface AnalyticsData {
		overview: {
			photos: { total: number; published: number; draft: number };
			albums: { total: number; public: number; private: number };
			users: { total: number; active: number; blocked: number };
			tags: { total: number; active: number; inactive: number };
			locations: { total: number; active: number; inactive: number };
			people: { total: number; active: number; inactive: number };
			groups: { total: number };
			pages: { total: number; published: number; draft: number };
			blogCategories: { total: number; active: number; inactive: number };
		};
		storage: {
			totalBytes: number;
			totalMB: number;
			totalGB: number;
			formatted: string;
		};
		recentActivity: {
			photos: number;
			albums: number;
			users: number;
			period: string;
		};
		topAlbums: Array<{
			_id: string;
			name: string | { en?: string; he?: string };
			alias: string;
			photoCount: number;
			isPublic: boolean;
		}>;
		topTags: Array<{
			_id: string;
			name: string | Record<string, string>;
			usageCount: number;
			isActive: boolean;
			category?: string;
			color?: string;
		}>;
		tagAnalytics?: {
			overview: { unused: number; recentlyCreated: number };
			byCategory: Array<{ category: string; count: number }>;
			unusedTags: Array<{ _id: string; name: string | Record<string, string>; category: string; isActive: boolean }>;
			recentTags: Array<{ _id: string; name: string | Record<string, string>; usageCount: number; category: string; createdAt: string }>;
			photoTagDistribution: Array<{ bucket: string; count: number }>;
		};
	}

	function getTagName(tag: { name: string | Record<string, string> }): string {
		const n = tag.name;
		if (typeof n === 'string') return n;
		if (n && typeof n === 'object') return n.en || n.he || Object.values(n)[0] || '';
		return '';
	}

	const TAG_DISTRIBUTION_ORDER = ['0', '1-3', '4-6', '7+'];

	let analytics: AnalyticsData | null = null;
	let viewsData: any = null;
	let searchData: any = null;
	let tagsData: any = null;
	let storageData: any = null;
	let loading = true;
	let loadingTab = false;
	let loadingAIHealth = false;
	let error = '';
	let aiHealthError = '';
	let aiHealth: AIProvidersHealthData | null = null;

	// Date range for filtered analytics
	let dateFrom = '';
	let dateTo = '';
	let period: 'day' | 'week' | 'month' = 'day';

	onMount(async () => {
		// Set default date range (last 30 days)
		const to = new Date();
		const from = new Date();
		from.setDate(from.getDate() - 30);
		dateTo = to.toISOString().split('T')[0];
		dateFrom = from.toISOString().split('T')[0];

		await loadAnalytics();
		await loadAIHealth();
	});

	async function loadAIHealth() {
		loadingAIHealth = true;
		aiHealthError = '';
		try {
			const response = await fetch('/api/admin/ai/providers/health');
			if (!response.ok) {
				await handleApiErrorResponse(response);
			}
			const result = await response.json();
			aiHealth = (result.data || result) as AIProvidersHealthData;
		} catch (err) {
			logger.error('Error loading AI providers health:', err);
			aiHealthError = handleError(err, 'Failed to load AI providers health');
		} finally {
			loadingAIHealth = false;
		}
	}

	async function loadAnalytics() {
		loading = true;
		error = '';
		try {
			const response = await fetch('/api/admin/analytics');
			if (!response.ok) {
				await handleApiErrorResponse(response);
			}
			const result = await response.json();
			analytics = result.data || result;
		} catch (err) {
			logger.error('Error loading analytics:', err);
			error = handleError(err, 'Failed to load analytics');
		} finally {
			loading = false;
		}
	}

	async function loadTabData(tab: Tab) {
		if (tab === 'overview') {
			await loadAnalytics();
			return;
		}

		loadingTab = true;
		try {
			const params = new URLSearchParams();
			if (dateFrom) params.set('dateFrom', dateFrom);
			if (dateTo) params.set('dateTo', dateTo);
			if (tab === 'views' || tab === 'search') params.set('period', period);

			const response = await fetch(`/api/admin/analytics/${tab}?${params}`);
			if (!response.ok) {
				await handleApiErrorResponse(response);
			}
			const result = await response.json();
			
			switch (tab) {
				case 'views':
					viewsData = result.data || result;
					break;
				case 'search':
					searchData = result.data || result;
					break;
				case 'tags':
					tagsData = result.data || result;
					break;
				case 'storage':
					storageData = result.data || result;
					break;
			}
		} catch (err) {
			logger.error(`Error loading ${tab} analytics:`, err);
			error = handleError(err, `Failed to load ${tab} analytics`);
		} finally {
			loadingTab = false;
		}
	}

	function handleTabChange(tab: Tab) {
		activeTab = tab;
		// Always load data when switching to a tab (will use cached data if already loaded)
		if (tab === 'views') {
			if (!viewsData) {
				loadTabData('views');
			}
		} else if (tab === 'search') {
			if (!searchData) {
				loadTabData('search');
			}
		} else if (tab === 'tags') {
			if (!tagsData) {
				loadTabData('tags');
			}
		} else if (tab === 'storage') {
			if (!storageData) {
				loadTabData('storage');
			}
		}
	}

	function exportData(type: Tab) {
		const params = new URLSearchParams();
		params.set('type', type);
		params.set('format', 'csv');
		if (dateFrom) params.set('dateFrom', dateFrom);
		if (dateTo) params.set('dateTo', dateTo);
		if (type === 'views' || type === 'search') params.set('period', period);
		window.open(`/api/admin/analytics/export?${params}`, '_blank');
	}

	// Album name function is now imported from shared utility
</script>

<svelte:head>
	<title>{$t('admin.analytics')} - {$t('navigation.admin')}</title>
</svelte:head>

<div class="min-h-screen bg-gray-50 py-8">
	<div class="max-w-6xl mx-auto px-4">
		<div class="flex items-center justify-between mb-6">
			<div>
				<h1 class="text-2xl font-bold text-gray-900">{$t('admin.analyticsAndStatistics')}</h1>
				<p class="text-gray-600 mt-2">{$t('admin.analyticsDescription')}</p>
			</div>
			<a href="/admin" class="px-4 py-2 bg-gray-600 text-white rounded-md hover:bg-gray-700 text-sm font-medium">
				{$t('admin.backToAdmin')}
			</a>
		</div>

		<!-- Tabs -->
		<div class="mb-6 border-b border-gray-200">
			<nav class="-mb-px flex space-x-8">
				<button
					class="py-4 px-1 border-b-2 font-medium text-sm {activeTab === 'overview' ? 'border-blue-500 text-blue-600' : 'border-transparent text-gray-500 hover:text-gray-700 hover:border-gray-300'}"
					on:click={() => handleTabChange('overview')}
				>
					{$t('admin.analyticsOverviewTab')}
				</button>
				<button
					class="py-4 px-1 border-b-2 font-medium text-sm {activeTab === 'views' ? 'border-blue-500 text-blue-600' : 'border-transparent text-gray-500 hover:text-gray-700 hover:border-gray-300'}"
					on:click={() => handleTabChange('views')}
				>
					{$t('admin.analyticsViewsTab')}
				</button>
				<button
					class="py-4 px-1 border-b-2 font-medium text-sm {activeTab === 'search' ? 'border-blue-500 text-blue-600' : 'border-transparent text-gray-500 hover:text-gray-700 hover:border-gray-300'}"
					on:click={() => handleTabChange('search')}
				>
					{$t('admin.analyticsSearchTab')}
				</button>
				<button
					class="py-4 px-1 border-b-2 font-medium text-sm {activeTab === 'tags' ? 'border-blue-500 text-blue-600' : 'border-transparent text-gray-500 hover:text-gray-700 hover:border-gray-300'}"
					on:click={() => handleTabChange('tags')}
				>
					{$t('admin.analyticsTagsTab')}
				</button>
				<button
					class="py-4 px-1 border-b-2 font-medium text-sm {activeTab === 'storage' ? 'border-blue-500 text-blue-600' : 'border-transparent text-gray-500 hover:text-gray-700 hover:border-gray-300'}"
					on:click={() => handleTabChange('storage')}
				>
					{$t('admin.analyticsStorageTab')}
				</button>
			</nav>
		</div>

		<!-- Date Range Filter (for tabs other than overview) -->
		{#if activeTab !== 'overview'}
			<div class="mb-6 bg-white rounded-lg shadow-sm border border-gray-200 p-4">
				<div class="flex flex-wrap items-center gap-4">
					<div>
						<label class="block text-sm font-medium text-gray-700 mb-1">From</label>
						<input
							type="date"
							bind:value={dateFrom}
							class="px-3 py-2 border border-gray-300 rounded-md text-sm"
							on:change={() => loadTabData(activeTab)}
						/>
					</div>
					<div>
						<label class="block text-sm font-medium text-gray-700 mb-1">To</label>
						<input
							type="date"
							bind:value={dateTo}
							class="px-3 py-2 border border-gray-300 rounded-md text-sm"
							on:change={() => loadTabData(activeTab)}
						/>
					</div>
					{#if activeTab === 'views'}
						<div>
							<label class="block text-sm font-medium text-gray-700 mb-1">Period</label>
							<select
								bind:value={period}
								class="px-3 py-2 border border-gray-300 rounded-md text-sm"
								on:change={() => loadTabData(activeTab)}
							>
								<option value="day">Daily</option>
								<option value="week">Weekly</option>
								<option value="month">Monthly</option>
							</select>
						</div>
					{/if}
					<div class="flex-1"></div>
					<button
						on:click={() => exportData(activeTab)}
						class="px-4 py-2 bg-blue-600 text-white rounded-md hover:bg-blue-700 text-sm font-medium"
					>
						Export CSV
					</button>
				</div>
			</div>
		{/if}

		{#if error}
			<div class="mb-4 p-4 rounded-md bg-red-50 text-red-700">{error}</div>
		{/if}

		{#if loading}
			<div class="text-center py-8">
				<div class="inline-block animate-spin rounded-full h-8 w-8 border-b-2 border-blue-600"></div>
				<p class="mt-2 text-gray-600">Loading analytics...</p>
			</div>
		{:else if activeTab === 'overview' && analytics}
			<!-- Overview Statistics -->
			<div class="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-4 mb-6">
				<div class="bg-white rounded-lg shadow-sm border border-gray-200 p-4">
					<div class="flex items-center justify-between">
						<div>
							<p class="text-sm text-gray-600">Total Photos</p>
							<p class="text-2xl font-bold text-gray-900">{analytics.overview.photos.total}</p>
							<p class="text-xs text-gray-500 mt-1">
								{analytics.overview.photos.published} published, {analytics.overview.photos.draft} draft
							</p>
						</div>
						<div class="p-3 bg-blue-100 rounded-lg">
							<svg class="w-6 h-6 text-blue-600" fill="none" stroke="currentColor" viewBox="0 0 24 24">
								<path
									stroke-linecap="round"
									stroke-linejoin="round"
									stroke-width="2"
									d="M4 16l4.586-4.586a2 2 0 012.828 0L16 16m-2-2l1.586-1.586a2 2 0 012.828 0L20 14m-6-6h.01M6 20h12a2 2 0 002-2V6a2 2 0 00-2-2H6a2 2 0 00-2 2v12a2 2 0 002 2z"
								/>
							</svg>
						</div>
					</div>
				</div>

				<div class="bg-white rounded-lg shadow-sm border border-gray-200 p-4">
					<div class="flex items-center justify-between">
						<div>
							<p class="text-sm text-gray-600">Total Albums</p>
							<p class="text-2xl font-bold text-gray-900">{analytics.overview.albums.total}</p>
							<p class="text-xs text-gray-500 mt-1">
								{analytics.overview.albums.public} public, {analytics.overview.albums.private} private
							</p>
						</div>
						<div class="p-3 bg-green-100 rounded-lg">
							<svg class="w-6 h-6 text-green-600" fill="none" stroke="currentColor" viewBox="0 0 24 24">
								<path
									stroke-linecap="round"
									stroke-linejoin="round"
									stroke-width="2"
									d="M3 7v10a2 2 0 002 2h14a2 2 0 002-2V9a2 2 0 00-2-2h-6l-2-2H5a2 2 0 00-2 2z"
								/>
							</svg>
						</div>
					</div>
				</div>

				<div class="bg-white rounded-lg shadow-sm border border-gray-200 p-4">
					<div class="flex items-center justify-between">
						<div>
							<p class="text-sm text-gray-600">Total Users</p>
							<p class="text-2xl font-bold text-gray-900">{analytics.overview.users.total}</p>
							<p class="text-xs text-gray-500 mt-1">
								{analytics.overview.users.active} active, {analytics.overview.users.blocked} blocked
							</p>
						</div>
						<div class="p-3 bg-purple-100 rounded-lg">
							<svg class="w-6 h-6 text-purple-600" fill="none" stroke="currentColor" viewBox="0 0 24 24">
								<path
									stroke-linecap="round"
									stroke-linejoin="round"
									stroke-width="2"
									d="M12 4.354a4 4 0 110 5.292M15 21H3v-1a6 6 0 0112 0v1zm0 0h6v-1a6 6 0 00-9-5.197M13 7a4 4 0 11-8 0 4 4 0 018 0z"
								/>
							</svg>
						</div>
					</div>
				</div>

				<div class="bg-white rounded-lg shadow-sm border border-gray-200 p-4">
					<div class="flex items-center justify-between">
						<div>
							<p class="text-sm text-gray-600">Storage Used</p>
							<p class="text-2xl font-bold text-gray-900">{analytics.storage.formatted}</p>
							<p class="text-xs text-gray-500 mt-1">
								{analytics.storage.totalMB.toFixed(2)} MB total
							</p>
						</div>
						<div class="p-3 bg-yellow-100 rounded-lg">
							<svg class="w-6 h-6 text-yellow-600" fill="none" stroke="currentColor" viewBox="0 0 24 24">
								<path
									stroke-linecap="round"
									stroke-linejoin="round"
									stroke-width="2"
									d="M4 7v10c0 2.21 3.582 4 8 4s8-1.79 8-4V7M4 7c0 2.21 3.582 4 8 4s8-1.79 8-4M4 7c0-2.21 3.582-4 8-4s8 1.79 8 4"
								/>
							</svg>
						</div>
					</div>
				</div>
			</div>

			<!-- Detailed Statistics Grid -->
			<div class="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4 mb-6">
				<div class="bg-white rounded-lg shadow-sm border border-gray-200 p-4">
					<h3 class="text-sm font-semibold text-gray-700 mb-3">Tags</h3>
					<div class="space-y-2">
						<div class="flex justify-between">
							<span class="text-gray-600">Total</span>
							<span class="font-semibold">{analytics.overview.tags.total}</span>
						</div>
						<div class="flex justify-between">
							<span class="text-gray-600">Active</span>
							<span class="text-green-600">{analytics.overview.tags.active}</span>
						</div>
						<div class="flex justify-between">
							<span class="text-gray-600">Inactive</span>
							<span class="text-gray-400">{analytics.overview.tags.inactive}</span>
						</div>
					</div>
				</div>

				<div class="bg-white rounded-lg shadow-sm border border-gray-200 p-4">
					<h3 class="text-sm font-semibold text-gray-700 mb-3">Locations</h3>
					<div class="space-y-2">
						<div class="flex justify-between">
							<span class="text-gray-600">Total</span>
							<span class="font-semibold">{analytics.overview.locations.total}</span>
						</div>
						<div class="flex justify-between">
							<span class="text-gray-600">Active</span>
							<span class="text-green-600">{analytics.overview.locations.active}</span>
						</div>
						<div class="flex justify-between">
							<span class="text-gray-600">Inactive</span>
							<span class="text-gray-400">{analytics.overview.locations.inactive}</span>
						</div>
					</div>
				</div>

				<div class="bg-white rounded-lg shadow-sm border border-gray-200 p-4">
					<h3 class="text-sm font-semibold text-gray-700 mb-3">People</h3>
					<div class="space-y-2">
						<div class="flex justify-between">
							<span class="text-gray-600">Total</span>
							<span class="font-semibold">{analytics.overview.people.total}</span>
						</div>
						<div class="flex justify-between">
							<span class="text-gray-600">Active</span>
							<span class="text-green-600">{analytics.overview.people.active}</span>
						</div>
						<div class="flex justify-between">
							<span class="text-gray-600">Inactive</span>
							<span class="text-gray-400">{analytics.overview.people.inactive}</span>
						</div>
					</div>
				</div>

				<div class="bg-white rounded-lg shadow-sm border border-gray-200 p-4">
					<h3 class="text-sm font-semibold text-gray-700 mb-3">Groups</h3>
					<div class="space-y-2">
						<div class="flex justify-between">
							<span class="text-gray-600">Total</span>
							<span class="font-semibold">{analytics.overview.groups.total}</span>
						</div>
					</div>
				</div>

				<div class="bg-white rounded-lg shadow-sm border border-gray-200 p-4">
					<h3 class="text-sm font-semibold text-gray-700 mb-3">Pages</h3>
					<div class="space-y-2">
						<div class="flex justify-between">
							<span class="text-gray-600">Total</span>
							<span class="font-semibold">{analytics.overview.pages.total}</span>
						</div>
						<div class="flex justify-between">
							<span class="text-gray-600">Published</span>
							<span class="text-green-600">{analytics.overview.pages.published}</span>
						</div>
						<div class="flex justify-between">
							<span class="text-gray-600">Draft</span>
							<span class="text-gray-400">{analytics.overview.pages.draft}</span>
						</div>
					</div>
				</div>

				<div class="bg-white rounded-lg shadow-sm border border-gray-200 p-4">
					<h3 class="text-sm font-semibold text-gray-700 mb-3">Blog Categories</h3>
					<div class="space-y-2">
						<div class="flex justify-between">
							<span class="text-gray-600">Total</span>
							<span class="font-semibold">{analytics.overview.blogCategories.total}</span>
						</div>
						<div class="flex justify-between">
							<span class="text-gray-600">Active</span>
							<span class="text-green-600">{analytics.overview.blogCategories.active}</span>
						</div>
						<div class="flex justify-between">
							<span class="text-gray-600">Inactive</span>
							<span class="text-gray-400">{analytics.overview.blogCategories.inactive}</span>
						</div>
					</div>
				</div>
			</div>

			<!-- AI Providers Health -->
			<div class="bg-white rounded-lg shadow-sm border border-gray-200 p-6 mb-6">
				<div class="flex items-center justify-between mb-4">
					<div>
						<h2 class="text-lg font-semibold text-gray-900">AI Providers Health</h2>
						<p class="text-sm text-gray-500 mt-1">Current provider selection and fallback readiness</p>
					</div>
					<button
						on:click={loadAIHealth}
						class="px-3 py-2 bg-gray-100 text-gray-700 rounded-md hover:bg-gray-200 text-sm font-medium"
						disabled={loadingAIHealth}
					>
						{loadingAIHealth ? 'Refreshing...' : 'Refresh'}
					</button>
				</div>

				{#if aiHealthError}
					<div class="mb-3 p-3 rounded-md bg-red-50 text-red-700 text-sm">{aiHealthError}</div>
				{/if}

				{#if aiHealth}
					<div class="mb-4 text-sm text-gray-700">
						<span class="font-medium">Configured:</span> {aiHealth.configuredProvider}
						<span class="mx-2 text-gray-400">|</span>
						<span class="font-medium">Active:</span>
						<span class="{aiHealth.activeProvider ? 'text-green-700' : 'text-red-700'}">
							{aiHealth.activeProvider || 'none'}
						</span>
					</div>

					<div class="grid grid-cols-1 md:grid-cols-3 gap-3">
						{#each ['google-vision', 'clip', 'local'] as key}
							{@const p = aiHealth.providers[key as ProviderKey]}
							<div class="rounded-md border p-3 {p?.available ? 'border-green-200 bg-green-50' : 'border-red-200 bg-red-50'}">
								<div class="flex items-center justify-between mb-1">
									<span class="font-medium text-gray-900">{key}</span>
									<span class="text-xs {p?.available ? 'text-green-700' : 'text-red-700'}">
										{p?.available ? 'available' : 'unavailable'}
									</span>
								</div>
								<p class="text-xs text-gray-700 wrap-break-word">{p?.reason || 'No details'}</p>
							</div>
						{/each}
					</div>
				{:else if loadingAIHealth}
					<div class="text-sm text-gray-500">Loading provider health...</div>
				{:else}
					<div class="text-sm text-gray-500">No provider health data yet.</div>
				{/if}
			</div>

			<!-- Recent Activity -->
			<div class="bg-white rounded-lg shadow-sm border border-gray-200 p-6 mb-6">
				<h2 class="text-lg font-semibold text-gray-900 mb-4">Recent Activity (Last {analytics.recentActivity.period})</h2>
				<div class="grid grid-cols-1 md:grid-cols-3 gap-4">
					<div class="text-center p-4 bg-blue-50 rounded-lg">
						<p class="text-2xl font-bold text-blue-600">{analytics.recentActivity.photos}</p>
						<p class="text-sm text-gray-600 mt-1">New Photos</p>
					</div>
					<div class="text-center p-4 bg-green-50 rounded-lg">
						<p class="text-2xl font-bold text-green-600">{analytics.recentActivity.albums}</p>
						<p class="text-sm text-gray-600 mt-1">New Albums</p>
					</div>
					<div class="text-center p-4 bg-purple-50 rounded-lg">
						<p class="text-2xl font-bold text-purple-600">{analytics.recentActivity.users}</p>
						<p class="text-sm text-gray-600 mt-1">New Users</p>
					</div>
				</div>
			</div>

			<!-- Enhanced Tag Analytics -->
			{#if analytics.tagAnalytics}
				<div class="bg-white rounded-lg shadow-sm border border-gray-200 p-6 mb-6">
					<h2 class="text-lg font-semibold text-gray-900 mb-4">Tag Analytics</h2>

					<div class="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-4 mb-6">
						<div class="p-4 bg-amber-50 rounded-lg border border-amber-100">
							<p class="text-sm text-amber-800">Unused tags</p>
							<p class="text-2xl font-bold text-amber-700">{analytics.tagAnalytics.overview.unused}</p>
							<p class="text-xs text-amber-600 mt-1">Never applied to photos</p>
						</div>
						<div class="p-4 bg-indigo-50 rounded-lg border border-indigo-100">
							<p class="text-sm text-indigo-800">Created (30 days)</p>
							<p class="text-2xl font-bold text-indigo-700">{analytics.tagAnalytics.overview.recentlyCreated}</p>
							<p class="text-xs text-indigo-600 mt-1">New tags this month</p>
						</div>
					</div>

					<div class="grid grid-cols-1 lg:grid-cols-2 gap-6 mb-6">
						<div>
							<h3 class="text-sm font-semibold text-gray-700 mb-3">Tags by category</h3>
							{#if analytics.tagAnalytics.byCategory.length === 0}
								<p class="text-gray-500 text-sm">No tags</p>
							{:else}
								<div class="space-y-2">
									{#each analytics.tagAnalytics.byCategory as cat}
										<div class="flex justify-between items-center py-1.5 border-b border-gray-100 last:border-0">
											<span class="text-gray-700 capitalize">{cat.category}</span>
											<span class="font-medium text-gray-900">{cat.count}</span>
										</div>
									{/each}
								</div>
							{/if}
						</div>
						<div>
							<h3 class="text-sm font-semibold text-gray-700 mb-3">Photos by tag count</h3>
							{#if analytics.tagAnalytics.photoTagDistribution.length === 0}
								<p class="text-gray-500 text-sm">No data</p>
							{:else}
								{@const distMap = Object.fromEntries(analytics.tagAnalytics.photoTagDistribution.map((d) => [d.bucket, d.count]))}
								<div class="space-y-2">
									{#each TAG_DISTRIBUTION_ORDER as bucket}
										<div class="flex justify-between items-center py-1.5 border-b border-gray-100 last:border-0">
											<span class="text-gray-700">{bucket} tags</span>
											<span class="font-medium text-gray-900">{distMap[bucket] ?? 0} photos</span>
										</div>
									{/each}
								</div>
							{/if}
						</div>
					</div>

					<div class="grid grid-cols-1 lg:grid-cols-2 gap-6">
						<div>
							<h3 class="text-sm font-semibold text-gray-700 mb-3">Unused tags (candidates for cleanup)</h3>
							{#if analytics.tagAnalytics.unusedTags.length === 0}
								<p class="text-gray-500 text-sm">All tags are in use</p>
							{:else}
								<div class="space-y-2 max-h-48 overflow-y-auto">
									{#each analytics.tagAnalytics.unusedTags as tag}
										<div class="flex justify-between items-center py-2 px-3 bg-gray-50 rounded text-sm">
											<span class="font-medium text-gray-900">{getTagName(tag)}</span>
											<span class="text-gray-500 capitalize text-xs">{tag.category}</span>
										</div>
									{/each}
								</div>
							{/if}
						</div>
						<div>
							<h3 class="text-sm font-semibold text-gray-700 mb-3">Recently created tags</h3>
							{#if analytics.tagAnalytics.recentTags.length === 0}
								<p class="text-gray-500 text-sm">No new tags in the last 30 days</p>
							{:else}
								<div class="space-y-2 max-h-48 overflow-y-auto">
									{#each analytics.tagAnalytics.recentTags as tag}
										<div class="flex justify-between items-center py-2 px-3 bg-gray-50 rounded text-sm">
											<span class="font-medium text-gray-900">{getTagName(tag)}</span>
											<span class="text-gray-500">{tag.usageCount} uses</span>
										</div>
									{/each}
								</div>
							{/if}
						</div>
					</div>
				</div>
			{/if}

			<!-- Top Albums and Tags -->
			<div class="grid grid-cols-1 lg:grid-cols-2 gap-6">
				<!-- Top Albums -->
				<div class="bg-white rounded-lg shadow-sm border border-gray-200 p-6">
					<h2 class="text-lg font-semibold text-gray-900 mb-4">Top Albums by Photo Count</h2>
					{#if analytics.topAlbums.length === 0}
						<p class="text-gray-500 text-sm">No albums found</p>
					{:else}
						<div class="space-y-3">
							{#each analytics.topAlbums as album}
								<div class="flex items-center justify-between p-3 bg-gray-50 rounded-lg">
									<div class="flex-1">
										<p class="font-medium text-gray-900">{getAlbumName(album)}</p>
										<p class="text-xs text-gray-500">{album.alias}</p>
									</div>
									<div class="text-right">
										<p class="text-lg font-bold text-blue-600">{album.photoCount}</p>
										<p class="text-xs text-gray-500">photos</p>
									</div>
								</div>
							{/each}
						</div>
					{/if}
				</div>

				<!-- Top Tags -->
				<div class="bg-white rounded-lg shadow-sm border border-gray-200 p-6">
					<h2 class="text-lg font-semibold text-gray-900 mb-4">Top Tags by Usage</h2>
					{#if analytics.topTags.length === 0}
						<p class="text-gray-500 text-sm">No tags found</p>
					{:else}
						<div class="space-y-3">
							{#each analytics.topTags as tag}
								<div class="flex items-center justify-between p-3 bg-gray-50 rounded-lg">
									<div class="flex-1 min-w-0">
										<p class="font-medium text-gray-900 truncate">{getTagName(tag)}</p>
										<p class="text-xs text-gray-500">
											{#if tag.isActive}
												<span class="text-green-600">Active</span>
											{:else}
												<span class="text-gray-400">Inactive</span>
											{/if}
											{#if tag.category}
												<span class="ml-1 capitalize"> · {tag.category}</span>
											{/if}
										</p>
									</div>
									<div class="text-right shrink-0 ml-2">
										<p class="text-lg font-bold text-green-600">{tag.usageCount}</p>
										<p class="text-xs text-gray-500">uses</p>
									</div>
								</div>
							{/each}
						</div>
					{/if}
				</div>
			</div>
		{:else if activeTab === 'views'}
			{#if loadingTab}
				<div class="text-center py-8">
					<div class="inline-block animate-spin rounded-full h-8 w-8 border-b-2 border-blue-600"></div>
					<p class="mt-2 text-gray-600">Loading views analytics...</p>
				</div>
			{:else if viewsData}
			<!-- Views Analytics -->
			<div class="space-y-6">
				<div class="bg-white rounded-lg shadow-sm border border-gray-200 p-6">
					<h2 class="text-lg font-semibold text-gray-900 mb-4">Views Summary</h2>
					<div class="grid grid-cols-1 md:grid-cols-4 gap-4">
						<div class="p-4 bg-blue-50 rounded-lg">
							<p class="text-sm text-blue-800">Total Views</p>
							<p class="text-2xl font-bold text-blue-700">{viewsData.summary?.total || 0}</p>
						</div>
						<div class="p-4 bg-green-50 rounded-lg">
							<p class="text-sm text-green-800">Unique Views</p>
							<p class="text-2xl font-bold text-green-700">{viewsData.summary?.unique || 0}</p>
						</div>
						<div class="p-4 bg-purple-50 rounded-lg">
							<p class="text-sm text-purple-800">Photo Views</p>
							<p class="text-2xl font-bold text-purple-700">{viewsData.summary?.photos || 0}</p>
						</div>
						<div class="p-4 bg-orange-50 rounded-lg">
							<p class="text-sm text-orange-800">Album Views</p>
							<p class="text-2xl font-bold text-orange-700">{viewsData.summary?.albums || 0}</p>
						</div>
					</div>
				</div>

				{#if viewsData.trends && viewsData.trends.length > 0}
					<div class="bg-white rounded-lg shadow-sm border border-gray-200 p-6">
						<h2 class="text-lg font-semibold text-gray-900 mb-4">Views Over Time</h2>
						<LineChart
							data={viewsData.trends.map((t: any) => ({ date: t.date, value: t.views }))}
							label="Views"
							color="#3b82f6"
							height={300}
						/>
					</div>
				{/if}

				{#if viewsData.topResources && viewsData.topResources.length > 0}
					<div class="bg-white rounded-lg shadow-sm border border-gray-200 p-6">
						<h2 class="text-lg font-semibold text-gray-900 mb-4">Top Viewed Resources</h2>
						<BarChart
							data={viewsData.topResources.slice(0, 10).map((r: any) => ({ label: r.name, value: r.views }))}
							label="Views"
							color="#10b981"
							height={300}
						/>
					</div>
				{/if}
			</div>
			{:else}
				<div class="text-center py-8 text-gray-500">No views data available</div>
			{/if}
		{:else if activeTab === 'search'}
			{#if loadingTab}
				<div class="text-center py-8">
					<div class="inline-block animate-spin rounded-full h-8 w-8 border-b-2 border-blue-600"></div>
					<p class="mt-2 text-gray-600">Loading search analytics...</p>
				</div>
			{:else if searchData}
			<!-- Search Analytics -->
			<div class="space-y-6">
				<div class="bg-white rounded-lg shadow-sm border border-gray-200 p-6">
					<h2 class="text-lg font-semibold text-gray-900 mb-4">Search Summary</h2>
					<div class="grid grid-cols-1 md:grid-cols-3 gap-4">
						<div class="p-4 bg-blue-50 rounded-lg">
							<p class="text-sm text-blue-800">Total Searches</p>
							<p class="text-2xl font-bold text-blue-700">{searchData.summary?.totalSearches || 0}</p>
						</div>
						<div class="p-4 bg-green-50 rounded-lg">
							<p class="text-sm text-green-800">Unique Queries</p>
							<p class="text-2xl font-bold text-green-700">{searchData.summary?.uniqueQueries || 0}</p>
						</div>
						<div class="p-4 bg-purple-50 rounded-lg">
							<p class="text-sm text-purple-800">Avg Results</p>
							<p class="text-2xl font-bold text-purple-700">{searchData.summary?.averageResults?.toFixed(1) || 0}</p>
						</div>
					</div>
				</div>

				{#if searchData.tagFilterStats}
					<div class="bg-white rounded-lg shadow-sm border border-gray-200 p-6">
						<h2 class="text-lg font-semibold text-gray-900 mb-1">
							{$t('admin.analyticsSearchTagFiltersTitle')}
						</h2>
						<p class="text-sm text-gray-500 mb-4">{$t('admin.analyticsSearchTagFiltersSubtitle')}</p>
						<div class="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-4 mb-6">
							<div class="p-4 bg-teal-50 rounded-lg border border-teal-100">
								<p class="text-sm text-teal-800">{$t('admin.analyticsSearchesWithTagFilter')}</p>
								<p class="text-2xl font-bold text-teal-700">
									{searchData.tagFilterStats.summary?.searchesWithTagFilter ?? 0}
								</p>
							</div>
							<div class="p-4 bg-cyan-50 rounded-lg border border-cyan-100">
								<p class="text-sm text-cyan-800">{$t('admin.analyticsShareOfAllSearches')}</p>
								<p class="text-2xl font-bold text-cyan-700">
									{(searchData.tagFilterStats.summary?.shareOfSearchesPercent ?? 0).toFixed(1)}%
								</p>
							</div>
							<div class="p-4 bg-rose-50 rounded-lg border border-rose-100">
								<p class="text-sm text-rose-800">{$t('admin.analyticsZeroResultsWithTagFilter')}</p>
								<p class="text-2xl font-bold text-rose-700">
									{searchData.tagFilterStats.summary?.zeroResultWithTagFilter ?? 0}
								</p>
							</div>
							<div class="p-4 bg-sky-50 rounded-lg border border-sky-100">
								<p class="text-sm text-sky-800">{$t('admin.analyticsAvgResultsWithTagFilter')}</p>
								<p class="text-2xl font-bold text-sky-700">
									{(searchData.tagFilterStats.summary?.averageResultsWhenTagFilter ?? 0).toFixed(1)}
								</p>
							</div>
						</div>
						{#if searchData.tagFilterStats.topFilterTags?.length > 0}
							<h3 class="text-sm font-semibold text-gray-700 mb-3">
								{$t('admin.analyticsTopTagsInSearchFilters')}
							</h3>
							<BarChart
								data={searchData.tagFilterStats.topFilterTags.slice(0, 12).map((t: any) => ({
									label: t.name?.length > 28 ? `${t.name.slice(0, 28)}…` : t.name,
									value: t.filterUses,
								}))}
								label={$t('admin.analyticsFilterUses')}
								color="#0d9488"
								height={320}
							/>
							<div class="mt-4 space-y-2">
								{#each searchData.tagFilterStats.topFilterTags.slice(0, 15) as row}
									<div
										class="flex flex-wrap items-center justify-between gap-2 p-2 bg-gray-50 rounded-md text-sm"
									>
										<span class="font-medium text-gray-900">{row.name}</span>
										<span class="text-gray-600">
											{row.filterUses}
											{$t('admin.analyticsFilterUses')} · {row.zeroResultCount}
											{$t('admin.analyticsZeroResultsShort')} · {row.averageResults?.toFixed?.(1) ?? row.averageResults}
											{$t('admin.analyticsAvgResultsShort')}
										</span>
									</div>
								{/each}
							</div>
						{:else if (searchData.tagFilterStats.summary?.searchesWithTagFilter ?? 0) === 0}
							<p class="text-sm text-gray-500">{$t('admin.analyticsNoTagFilterSearchesInPeriod')}</p>
						{/if}
					</div>
				{/if}

				{#if searchData.tagFilterTrends && searchData.tagFilterTrends.length > 0}
					<div class="bg-white rounded-lg shadow-sm border border-gray-200 p-6">
						<h2 class="text-lg font-semibold text-gray-900 mb-4">{$t('admin.analyticsTagFilterTrendsTitle')}</h2>
						<LineChart
							data={searchData.tagFilterTrends.map((t: any) => ({ date: t.date, value: t.searches }))}
							label={$t('admin.analyticsSearchesWithTagFilter')}
							color="#0d9488"
							height={300}
						/>
					</div>
				{/if}

				{#if searchData.tagFilterByType}
					<div class="bg-white rounded-lg shadow-sm border border-gray-200 p-6">
						<h2 class="text-lg font-semibold text-gray-900 mb-4">{$t('admin.analyticsTagFilterByTypeTitle')}</h2>
						<BarChart
							data={[
								{ label: 'Photos', value: searchData.tagFilterByType.photos?.searches || 0 },
								{ label: 'Albums', value: searchData.tagFilterByType.albums?.searches || 0 },
								{ label: 'People', value: searchData.tagFilterByType.people?.searches || 0 },
								{ label: 'Locations', value: searchData.tagFilterByType.locations?.searches || 0 },
								{ label: 'All', value: searchData.tagFilterByType.all?.searches || 0 },
							].filter((d) => d.value > 0)}
							label={$t('admin.analyticsSearchesWithTagFilter')}
							color="#0ea5e9"
							height={280}
						/>
					</div>
				{/if}

				{#if searchData.topTagPairs && searchData.topTagPairs.length > 0}
					<div class="bg-white rounded-lg shadow-sm border border-gray-200 p-6">
						<h2 class="text-lg font-semibold text-gray-900 mb-4">{$t('admin.analyticsTopTagPairsTitle')}</h2>
						<BarChart
							data={searchData.topTagPairs.slice(0, 12).map((p: any) => ({
								label: `${p.tagAName} + ${p.tagBName}`.length > 32
									? `${`${p.tagAName} + ${p.tagBName}`.slice(0, 32)}…`
									: `${p.tagAName} + ${p.tagBName}`,
								value: p.filterUses,
							}))}
							label={$t('admin.analyticsFilterUses')}
							color="#8b5cf6"
							height={320}
						/>
						<div class="mt-4 space-y-2">
							{#each searchData.topTagPairs.slice(0, 15) as row}
								<div class="flex flex-wrap items-center justify-between gap-2 p-2 bg-gray-50 rounded-md text-sm">
									<span class="font-medium text-gray-900">{row.tagAName} + {row.tagBName}</span>
									<span class="text-gray-600">
										{row.filterUses} {$t('admin.analyticsFilterUses')} · {row.zeroResultCount} {$t('admin.analyticsZeroResultsShort')} · {row.averageResults?.toFixed?.(1) ?? row.averageResults} {$t('admin.analyticsAvgResultsShort')}
									</span>
								</div>
							{/each}
						</div>
					</div>
				{/if}

				{#if searchData.trends && searchData.trends.length > 0}
					<div class="bg-white rounded-lg shadow-sm border border-gray-200 p-6">
						<h2 class="text-lg font-semibold text-gray-900 mb-4">Search Trends</h2>
						<LineChart
							data={searchData.trends.map((t: any) => ({ date: t.date, value: t.searches }))}
							label="Searches"
							color="#3b82f6"
							height={300}
						/>
					</div>
				{/if}

				{#if searchData.byType}
					<div class="bg-white rounded-lg shadow-sm border border-gray-200 p-6">
						<h2 class="text-lg font-semibold text-gray-900 mb-4">Searches by Type</h2>
						<PieChart
							data={[
								{ label: 'Photos', value: searchData.byType.photos || 0 },
								{ label: 'Albums', value: searchData.byType.albums || 0 },
								{ label: 'People', value: searchData.byType.people || 0 },
								{ label: 'Locations', value: searchData.byType.locations || 0 },
							].filter((d) => d.value > 0)}
							height={300}
						/>
					</div>
				{/if}

				{#if searchData.popularQueries && searchData.popularQueries.length > 0}
					<div class="bg-white rounded-lg shadow-sm border border-gray-200 p-6">
						<h2 class="text-lg font-semibold text-gray-900 mb-4">Popular Search Queries</h2>
						<div class="space-y-2">
							{#each searchData.popularQueries as query}
								<div class="flex items-center justify-between p-3 bg-gray-50 rounded-lg">
									<div>
										<p class="font-medium text-gray-900">"{query.query}"</p>
										<p class="text-xs text-gray-500">Last searched: {new Date(query.lastSearched).toLocaleDateString()}</p>
									</div>
									<div class="text-right">
										<p class="text-lg font-bold text-blue-600">{query.count}</p>
										<p class="text-xs text-gray-500">searches</p>
									</div>
								</div>
							{/each}
						</div>
					</div>
				{/if}
			</div>
			{:else}
				<div class="text-center py-8 text-gray-500">No search data available</div>
			{/if}
		{:else if activeTab === 'tags'}
			{#if loadingTab}
				<div class="text-center py-8">
					<div class="inline-block animate-spin rounded-full h-8 w-8 border-b-2 border-blue-600"></div>
					<p class="mt-2 text-gray-600">Loading tags analytics...</p>
				</div>
			{:else if tagsData}
			<!-- Tags Analytics -->
			<div class="space-y-6">
				{#if tagsData.tagsCreated && tagsData.tagsCreated.length > 0}
					<div class="bg-white rounded-lg shadow-sm border border-gray-200 p-6">
						<h2 class="text-lg font-semibold text-gray-900 mb-4">Tag Creation Trends</h2>
						<LineChart
							data={tagsData.tagsCreated.map((t: any) => ({ date: t.date, value: t.count }))}
							label="Tags Created"
							color="#3b82f6"
							height={300}
						/>
					</div>
				{/if}

				{#if tagsData.tagsUsed && tagsData.tagsUsed.length > 0}
					<div class="bg-white rounded-lg shadow-sm border border-gray-200 p-6">
						<h2 class="text-lg font-semibold text-gray-900 mb-4">Tag Usage Trends</h2>
						<LineChart
							data={tagsData.tagsUsed.map((t: any) => ({ date: t.date, value: t.totalUsage }))}
							label="Tag Usage"
							color="#10b981"
							height={300}
						/>
					</div>
				{/if}

				{#if tagsData.topTags && tagsData.topTags.length > 0}
					<div class="bg-white rounded-lg shadow-sm border border-gray-200 p-6">
						<h2 class="text-lg font-semibold text-gray-900 mb-4">Top Tags by Usage</h2>
						<BarChart
							data={tagsData.topTags.slice(0, 15).map((t: any) => ({
								label: typeof t.name === 'string' ? t.name : t.name?.en || 'Unknown',
								value: t.usageCount || 0,
							}))}
							label="Usage Count"
							color="#8b5cf6"
							height={400}
						/>
					</div>
				{/if}
			</div>
			{:else}
				<div class="text-center py-8 text-gray-500">No tags data available</div>
			{/if}
		{:else if activeTab === 'storage'}
			{#if loadingTab}
				<div class="text-center py-8">
					<div class="inline-block animate-spin rounded-full h-8 w-8 border-b-2 border-blue-600"></div>
					<p class="mt-2 text-gray-600">Loading storage analytics...</p>
				</div>
			{:else if storageData}
			<!-- Storage Analytics -->
			<div class="space-y-6">
				<div class="bg-white rounded-lg shadow-sm border border-gray-200 p-6">
					<h2 class="text-lg font-semibold text-gray-900 mb-4">Storage Summary</h2>
					<div class="grid grid-cols-1 md:grid-cols-4 gap-4">
						<div class="p-4 bg-blue-50 rounded-lg">
							<p class="text-sm text-blue-800">Total Storage</p>
							<p class="text-2xl font-bold text-blue-700">{storageData.summary?.totalGB?.toFixed(2) || 0} GB</p>
						</div>
						<div class="p-4 bg-green-50 rounded-lg">
							<p class="text-sm text-green-800">Total Photos</p>
							<p class="text-2xl font-bold text-green-700">{storageData.summary?.totalPhotos || 0}</p>
						</div>
						<div class="p-4 bg-purple-50 rounded-lg">
							<p class="text-sm text-purple-800">Avg Size</p>
							<p class="text-2xl font-bold text-purple-700">{storageData.summary?.averageSizeMB?.toFixed(2) || 0} MB</p>
						</div>
						<div class="p-4 bg-orange-50 rounded-lg">
							<p class="text-sm text-orange-800">Total MB</p>
							<p class="text-2xl font-bold text-orange-700">{storageData.summary?.totalMB?.toFixed(2) || 0}</p>
						</div>
					</div>
				</div>

				{#if storageData.byProvider && storageData.byProvider.length > 0}
					<div class="bg-white rounded-lg shadow-sm border border-gray-200 p-6">
						<h2 class="text-lg font-semibold text-gray-900 mb-4">Storage by Provider</h2>
						<PieChart
							data={storageData.byProvider.map((p: any) => ({
								label: p.provider,
								value: p.totalGB,
							}))}
							height={300}
						/>
					</div>
				{/if}

				{#if storageData.byAlbum && storageData.byAlbum.length > 0}
					<div class="bg-white rounded-lg shadow-sm border border-gray-200 p-6">
						<h2 class="text-lg font-semibold text-gray-900 mb-4">Storage by Album (Top 20)</h2>
						<BarChart
							data={storageData.byAlbum.map((a: any) => ({
								label: a.name.length > 20 ? a.name.substring(0, 20) + '...' : a.name,
								value: a.storageMB,
							}))}
							label="Storage (MB)"
							color="#f59e0b"
							height={400}
						/>
					</div>
				{/if}
			</div>
			{:else}
				<div class="text-center py-8 text-gray-500">No storage data available</div>
			{/if}
		{/if}
	</div>
</div>
