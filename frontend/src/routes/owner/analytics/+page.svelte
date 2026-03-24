<script lang="ts">
	import { onMount } from 'svelte';
	import { t } from '$stores/i18n';
	import { productName } from '$stores/siteConfig';
	import { logger } from '$lib/utils/logger';
	import { handleError, handleApiErrorResponse } from '$lib/utils/errorHandler';
	import BarChart from '$lib/components/analytics/BarChart.svelte';
	import type { PageData } from './$types';

	export let data: PageData;

	let dateFrom = '';
	let dateTo = '';
	let loading = true;
	let error = '';
	let payload: {
		summary?: { totalSearches?: number };
		tagFilterStats?: {
			summary: {
				searchesWithTagFilter: number;
				shareOfSearchesPercent: number;
				zeroResultWithTagFilter: number;
				averageResultsWhenTagFilter: number;
			};
			topFilterTags: Array<{
				tagId: string;
				name: string;
				filterUses: number;
				zeroResultCount: number;
				averageResults: number;
			}>;
		};
	} | null = null;

	const isAdmin = data.user?.role === 'admin';

	function setDefaultRange() {
		const to = new Date();
		const from = new Date();
		from.setDate(from.getDate() - 30);
		dateTo = to.toISOString().split('T')[0];
		dateFrom = from.toISOString().split('T')[0];
	}

	async function loadStats() {
		if (isAdmin) return;
		loading = true;
		error = '';
		try {
			const params = new URLSearchParams();
			if (dateFrom) params.set('dateFrom', dateFrom);
			if (dateTo) params.set('dateTo', dateTo);
			const response = await fetch(`/api/owner/analytics/search-tag-filters?${params}`);
			if (!response.ok) {
				await handleApiErrorResponse(response);
			}
			const result = await response.json();
			payload = result.data || result;
		} catch (err) {
			logger.error('Owner search insights:', err);
			error = handleError(err, 'Failed to load insights');
		} finally {
			loading = false;
		}
	}

	onMount(() => {
		setDefaultRange();
		if (!isAdmin) {
			loadStats();
		} else {
			loading = false;
		}
	});

	function applyRange() {
		loadStats();
	}
</script>

<svelte:head>
	<title>{$t('owner.analyticsPageTitle')} - {$productName}</title>
</svelte:head>

<div class="min-h-screen bg-gray-50 py-8">
	<div class="max-w-5xl mx-auto px-4">
		<div class="mb-6">
			<a
				href="/owner"
				class="text-sm text-blue-600 hover:text-blue-800 font-medium"
			>
				{$t('owner.backToDashboard')}
			</a>
		</div>

		<h1 class="text-3xl font-bold text-gray-900 mb-2">{$t('owner.analyticsPageTitle')}</h1>
		<p class="text-gray-600 mb-8">{$t('owner.analyticsPageSubtitle')}</p>

		{#if isAdmin}
			<div class="bg-white rounded-lg shadow-sm border border-amber-200 p-6 mb-6">
				<p class="text-gray-800 mb-4">{$t('owner.analyticsAdminUseAdminPanel')}</p>
				<a
					href="/admin/analytics"
					class="inline-flex items-center px-4 py-2 bg-blue-600 text-white rounded-md hover:bg-blue-700"
				>
					{$t('owner.analyticsOpenAdminAnalytics')}
				</a>
			</div>
		{:else if loading}
			<div class="text-center py-16 text-gray-500">{$t('loading.loading')}</div>
		{:else if error}
			<div class="p-4 rounded-md bg-red-50 text-red-700 text-sm mb-6">{error}</div>
			<button
				type="button"
				class="px-4 py-2 bg-gray-200 rounded-md text-gray-800"
				on:click={loadStats}
			>
				{$t('owner.tryAgain')}
			</button>
		{:else if payload}
			<div class="bg-white rounded-lg shadow-sm border border-gray-200 p-4 mb-6">
				<div class="flex flex-wrap items-end gap-4">
					<div>
						<label class="block text-xs font-medium text-gray-600 mb-1" for="df">{$t('owner.analyticsDateFrom')}</label>
						<input
							id="df"
							type="date"
							bind:value={dateFrom}
							class="border border-gray-300 rounded-md px-3 py-2 text-sm"
						/>
					</div>
					<div>
						<label class="block text-xs font-medium text-gray-600 mb-1" for="dt">{$t('owner.analyticsDateTo')}</label>
						<input
							id="dt"
							type="date"
							bind:value={dateTo}
							class="border border-gray-300 rounded-md px-3 py-2 text-sm"
						/>
					</div>
					<button
						type="button"
						class="px-4 py-2 bg-blue-600 text-white rounded-md hover:bg-blue-700 text-sm font-medium"
						on:click={applyRange}
					>
						{$t('owner.analyticsApplyRange')}
					</button>
				</div>
			</div>

			<div class="bg-white rounded-lg shadow-sm border border-gray-200 p-6 mb-6">
				<p class="text-sm text-gray-500 mb-1">{$t('owner.analyticsTotalSearches')}</p>
				<p class="text-3xl font-bold text-gray-900">{payload.summary?.totalSearches ?? 0}</p>
			</div>

			{#if payload.tagFilterStats}
				<div class="bg-white rounded-lg shadow-sm border border-gray-200 p-6 mb-6">
					<h2 class="text-lg font-semibold text-gray-900 mb-1">
						{$t('admin.analyticsSearchTagFiltersTitle')}
					</h2>
					<p class="text-sm text-gray-500 mb-4">{$t('admin.analyticsSearchTagFiltersSubtitle')}</p>
					<div class="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-4 mb-6">
						<div class="p-4 bg-teal-50 rounded-lg border border-teal-100">
							<p class="text-sm text-teal-800">{$t('admin.analyticsSearchesWithTagFilter')}</p>
							<p class="text-2xl font-bold text-teal-700">
								{payload.tagFilterStats.summary?.searchesWithTagFilter ?? 0}
							</p>
						</div>
						<div class="p-4 bg-cyan-50 rounded-lg border border-cyan-100">
							<p class="text-sm text-cyan-800">{$t('admin.analyticsShareOfAllSearches')}</p>
							<p class="text-2xl font-bold text-cyan-700">
								{(payload.tagFilterStats.summary?.shareOfSearchesPercent ?? 0).toFixed(1)}%
							</p>
						</div>
						<div class="p-4 bg-rose-50 rounded-lg border border-rose-100">
							<p class="text-sm text-rose-800">{$t('admin.analyticsZeroResultsWithTagFilter')}</p>
							<p class="text-2xl font-bold text-rose-700">
								{payload.tagFilterStats.summary?.zeroResultWithTagFilter ?? 0}
							</p>
						</div>
						<div class="p-4 bg-sky-50 rounded-lg border border-sky-100">
							<p class="text-sm text-sky-800">{$t('admin.analyticsAvgResultsWithTagFilter')}</p>
							<p class="text-2xl font-bold text-sky-700">
								{(payload.tagFilterStats.summary?.averageResultsWhenTagFilter ?? 0).toFixed(1)}
							</p>
						</div>
					</div>
					{#if payload.tagFilterStats.topFilterTags?.length > 0}
						<h3 class="text-sm font-semibold text-gray-700 mb-3">
							{$t('admin.analyticsTopTagsInSearchFilters')}
						</h3>
						<BarChart
							data={payload.tagFilterStats.topFilterTags.slice(0, 12).map((t) => ({
								label: t.name?.length > 28 ? `${t.name.slice(0, 28)}…` : t.name,
								value: t.filterUses,
							}))}
							label={$t('admin.analyticsFilterUses')}
							color="#0d9488"
							height={320}
						/>
						<div class="mt-4 space-y-2">
							{#each payload.tagFilterStats.topFilterTags.slice(0, 15) as row}
								<div
									class="flex flex-wrap items-center justify-between gap-2 p-2 bg-gray-50 rounded-md text-sm"
								>
									<span class="font-medium text-gray-900">{row.name}</span>
									<span class="text-gray-600">
										{row.filterUses}
										{$t('admin.analyticsFilterUses')} · {row.zeroResultCount}
										{$t('admin.analyticsZeroResultsShort')} · {row.averageResults?.toFixed?.(1) ??
											row.averageResults}
										{$t('admin.analyticsAvgResultsShort')}
									</span>
								</div>
							{/each}
						</div>
					{:else if (payload.tagFilterStats.summary?.searchesWithTagFilter ?? 0) === 0}
						<p class="text-sm text-gray-500">{$t('admin.analyticsNoTagFilterSearchesInPeriod')}</p>
					{/if}
				</div>
			{/if}
		{/if}
	</div>
</div>
