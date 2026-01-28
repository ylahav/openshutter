<script lang="ts">
	import { onMount } from 'svelte';
	import { getAlbumName } from '$lib/utils/albumUtils';
	import { logger } from '$lib/utils/logger';
	import { handleError, handleApiErrorResponse } from '$lib/utils/errorHandler';
	import type { PageData } from './$types';

	export let data: PageData;

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
			name: string;
			usageCount: number;
			isActive: boolean;
		}>;
	}

	let analytics: AnalyticsData | null = null;
	let loading = true;
	let error = '';

	onMount(async () => {
		await loadAnalytics();
	});

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

	// Album name function is now imported from shared utility
</script>

<svelte:head>
	<title>Analytics - Admin</title>
</svelte:head>

<div class="min-h-screen bg-gray-50 py-8">
	<div class="max-w-6xl mx-auto px-4">
		<div class="flex items-center justify-between mb-6">
			<div>
				<h1 class="text-2xl font-bold text-gray-900">Analytics & Statistics</h1>
				<p class="text-gray-600 mt-2">View comprehensive statistics about your gallery</p>
			</div>
			<a href="/admin" class="text-blue-600 hover:text-blue-800 text-sm font-medium">
				← Back to Admin
			</a>
		</div>

		{#if error}
			<div class="mb-4 p-4 rounded-md bg-red-50 text-red-700">{error}</div>
		{/if}

		{#if loading}
			<div class="text-center py-8">
				<div class="inline-block animate-spin rounded-full h-8 w-8 border-b-2 border-blue-600"></div>
				<p class="mt-2 text-gray-600">Loading analytics...</p>
			</div>
		{:else if analytics}
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
									<div class="flex-1">
										<p class="font-medium text-gray-900">{tag.name}</p>
										<p class="text-xs text-gray-500">
											{#if tag.isActive}
												<span class="text-green-600">Active</span>
											{:else}
												<span class="text-gray-400">Inactive</span>
											{/if}
										</p>
									</div>
									<div class="text-right">
										<p class="text-lg font-bold text-green-600">{tag.usageCount}</p>
										<p class="text-xs text-gray-500">uses</p>
									</div>
								</div>
							{/each}
						</div>
					{/if}
				</div>
			</div>
		{/if}
	</div>
</div>
