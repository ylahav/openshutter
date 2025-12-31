<script lang="ts">
	import { onMount } from 'svelte';
	import { page } from '$app/stores';
	import { currentLanguage } from '$stores/language';
	import { MultiLangUtils } from '$utils/multiLang';
	import { t } from '$stores/i18n';
	import SearchBar from './SearchBar.svelte';
	import SearchResults from './SearchResults.svelte';

	export let initialQuery = '';

	interface AdvancedFilters {
		albumId: string | null;
		tags: string[];
		people: string[];
		locationIds: string[];
		dateFrom: string;
		dateTo: string;
	}

	interface SearchResult {
		photos: any[];
		albums: any[];
		people: any[];
		locations: any[];
		totalPhotos: number;
		totalAlbums: number;
		totalPeople: number;
		totalLocations: number;
		page: number;
		limit: number;
		hasMore: boolean;
	}

	let query = initialQuery || $page.url.searchParams.get('q') || '';
	let filters: AdvancedFilters = {
		albumId: $page.url.searchParams.get('albumId') || null,
		tags: $page.url.searchParams.get('tags')?.split(',').filter(Boolean) || [],
		people: $page.url.searchParams.get('people')?.split(',').filter(Boolean) || [],
		locationIds: $page.url.searchParams.get('locationIds')?.split(',').filter(Boolean) || [],
		dateFrom: $page.url.searchParams.get('dateFrom') || '',
		dateTo: $page.url.searchParams.get('dateTo') || ''
	};

	let results: SearchResult = {
		photos: [],
		albums: [],
		people: [],
		locations: [],
		totalPhotos: 0,
		totalAlbums: 0,
		totalPeople: 0,
		totalLocations: 0,
		page: 1,
		limit: 20,
		hasMore: false
	};

	let loading = false;
	let error: string | null = null;
	let currentPage = 1;
	let searchTimeout: ReturnType<typeof setTimeout> | null = null;

	// Update filters when URL changes
	$: {
		const urlParams = $page.url.searchParams;
		filters = {
			albumId: urlParams.get('albumId') || null,
			tags: urlParams.get('tags')?.split(',').filter(Boolean) || [],
			people: urlParams.get('people')?.split(',').filter(Boolean) || [],
			locationIds: urlParams.get('locationIds')?.split(',').filter(Boolean) || [],
			dateFrom: urlParams.get('dateFrom') || '',
			dateTo: urlParams.get('dateTo') || ''
		};
		query = urlParams.get('q') || query;
	}

	// Auto-search when query or filters change
	$: {
		if (searchTimeout) clearTimeout(searchTimeout);
		searchTimeout = setTimeout(() => {
			currentPage = 1;
			performSearch(1, false);
		}, 300);
	}

	onMount(() => {
		if (query || Object.values(filters).some((v) => (Array.isArray(v) ? v.length > 0 : v))) {
			performSearch(1, false);
		}
	});

	async function performSearch(page = 1, append = false) {
		if (!query.trim() && !hasActiveFilters()) {
			results = {
				photos: [],
				albums: [],
				people: [],
				locations: [],
				totalPhotos: 0,
				totalAlbums: 0,
				totalPeople: 0,
				totalLocations: 0,
				page: 1,
				limit: 20,
				hasMore: false
			};
			return;
		}

		loading = true;
		error = null;

		try {
			const searchParams = new URLSearchParams({
				q: query || '',
				type: 'photos',
				page: page.toString(),
				limit: '20',
				...(filters.albumId && { albumId: filters.albumId }),
				...(filters.tags.length > 0 && { tags: filters.tags.join(',') }),
				...(filters.people.length > 0 && { people: filters.people.join(',') }),
				...(filters.locationIds.length > 0 && { locationIds: filters.locationIds.join(',') }),
				...(filters.dateFrom && filters.dateFrom.trim() && { dateFrom: filters.dateFrom.trim() }),
				...(filters.dateTo && filters.dateTo.trim() && { dateTo: filters.dateTo.trim() }),
				sortBy: 'date',
				sortOrder: 'desc'
			});

			const response = await fetch(`/api/search?${searchParams}`);
			const data = await response.json();

			if (data.success) {
				const newResults = data.data || data.results || {
					photos: [],
					albums: [],
					people: [],
					locations: [],
					totalPhotos: 0,
					totalAlbums: 0,
					totalPeople: 0,
					totalLocations: 0,
					page: 1,
					limit: 20,
					hasMore: false
				};

				if (append && results.photos) {
					results = {
						...newResults,
						photos: [...results.photos, ...newResults.photos]
					};
				} else {
					results = newResults;
				}

				currentPage = page;
			} else {
				error = data.error || $t('search.error');
			}
		} catch (err) {
			error = $t('search.error');
			console.error('Search error:', err);
		} finally {
			loading = false;
		}
	}

	function hasActiveFilters(): boolean {
		return !!(
			filters.albumId ||
			filters.tags.length > 0 ||
			filters.people.length > 0 ||
			filters.locationIds.length > 0 ||
			filters.dateFrom ||
			filters.dateTo
		);
	}

	function handleLoadMore() {
		if (!loading && results.hasMore) {
			performSearch(currentPage + 1, true);
		}
	}

	function handleSearch(newQuery: string) {
		query = newQuery;
	}
</script>

<div class="min-h-screen bg-gray-50">
	<div class="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-8">
		<!-- Search Bar -->
		<div class="mb-6">
			<SearchBar {query} {loading} on:search={(e) => handleSearch(e.detail)} />
		</div>

		<!-- Active Filters Display -->
		{#if hasActiveFilters()}
			<div class="mb-4 flex flex-wrap gap-2">
				{#if filters.albumId}
					<span class="px-3 py-1 bg-blue-100 text-blue-800 rounded-full text-sm">
						{$t('search.album')}: {filters.albumId}
						<button
							on:click={() => {
								filters = { ...filters, albumId: null };
							}}
							class="ml-2 hover:text-blue-900"
						>
							×
						</button>
					</span>
				{/if}
				{#each filters.tags as tagId}
					<span class="px-3 py-1 bg-blue-100 text-blue-800 rounded-full text-sm">
						{$t('search.tags')}: {tagId}
						<button
							on:click={() => {
								filters = { ...filters, tags: filters.tags.filter((id) => id !== tagId) };
							}}
							class="ml-2 hover:text-blue-900"
						>
							×
						</button>
					</span>
				{/each}
				{#each filters.people as personId}
					<span class="px-3 py-1 bg-blue-100 text-blue-800 rounded-full text-sm">
						{$t('search.people')}: {personId}
						<button
							on:click={() => {
								filters = { ...filters, people: filters.people.filter((id) => id !== personId) };
							}}
							class="ml-2 hover:text-blue-900"
						>
							×
						</button>
					</span>
				{/each}
				{#each filters.locationIds as locationId}
					<span class="px-3 py-1 bg-blue-100 text-blue-800 rounded-full text-sm">
						{$t('search.locations')}: {locationId}
						<button
							on:click={() => {
								filters = {
									...filters,
									locationIds: filters.locationIds.filter((id) => id !== locationId)
								};
							}}
							class="ml-2 hover:text-blue-900"
						>
							×
						</button>
					</span>
				{/each}
			</div>
		{/if}

		<!-- Search Results -->
		<SearchResults {results} {loading} {error} {query} on:loadMore={handleLoadMore} />
	</div>
</div>
