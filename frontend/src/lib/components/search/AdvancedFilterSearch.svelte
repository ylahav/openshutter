<script lang="ts">
	import { onMount } from 'svelte';
	import { page } from '$app/stores';
	import { goto } from '$app/navigation';
	import { currentLanguage } from '$stores/language';
	import { MultiLangUtils } from '$utils/multiLang';
	import { t } from '$stores/i18n';
	import SearchBar from './SearchBar.svelte';
	import SearchResults from './SearchResults.svelte';
	import { logger } from '$lib/utils/logger';

	export let initialQuery = '';

	interface AdvancedFilters {
		albumId: string | null;
		tags: string[];
		people: string[];
		locationIds: string[];
		dateFrom: string;
		dateTo: string;
		sortOrder: 'asc' | 'desc';
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
		dateTo: $page.url.searchParams.get('dateTo') || '',
		sortOrder: ($page.url.searchParams.get('sortOrder') as 'asc' | 'desc') || 'desc'
	};

	let showFilterPanel = false;
	let filterOptions: { albums: any[]; tags: any[]; people: any[]; locations: any[] } = {
		albums: [],
		tags: [],
		people: [],
		locations: []
	};
	let draftFilters: AdvancedFilters = { ...filters };

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
			dateTo: urlParams.get('dateTo') || '',
			sortOrder: (urlParams.get('sortOrder') as 'asc' | 'desc') || 'desc'
		};
		query = urlParams.get('q') || query;
	}

	// Auto-search when query or filters change (must depend on filters/query so Apply triggers search)
	$: filters, query, (function runDebouncedSearch() {
		if (searchTimeout) clearTimeout(searchTimeout);
		searchTimeout = setTimeout(() => {
			currentPage = 1;
			performSearch(1, false);
		}, 300);
	})();

	onMount(() => {
		if (query || Object.values(filters).some((v) => (Array.isArray(v) ? v.length > 0 : v))) {
			performSearch(1, false);
		}
	});

	async function performSearch(page = 1, append = false) {
		// Allow search with only filters (no text query)
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
			const peopleParam = filters.people.map(toIdString).filter(Boolean);
			const tagsParam = filters.tags.map(toIdString).filter(Boolean);
			const locationIdsParam = filters.locationIds.map(toIdString).filter(Boolean);
			const body = {
				q: query?.trim() || '',
				type: 'photos' as const,
				page,
				limit: 20,
				...(filters.albumId && { albumId: toIdString(filters.albumId) }),
				...(tagsParam.length > 0 && { tags: tagsParam }),
				...(peopleParam.length > 0 && { people: peopleParam }),
				...(locationIdsParam.length > 0 && { locationIds: locationIdsParam }),
				...(filters.dateFrom?.trim() && { dateFrom: filters.dateFrom.trim() }),
				...(filters.dateTo?.trim() && { dateTo: filters.dateTo.trim() }),
				sortBy: 'date' as const,
				sortOrder: filters.sortOrder || ('desc' as const)
			};

			const response = await fetch('/api/search', {
				method: 'POST',
				headers: { 'Content-Type': 'application/json' },
				body: JSON.stringify(body),
				credentials: 'include'
			});
			const text = await response.text();
			let data: any;
			try {
				data = text ? JSON.parse(text) : {};
			} catch {
				error = response.ok
					? $t('search.error')
					: `${$t('search.error')}: ${response.status} ${response.statusText}`;
				return;
			}

			// Accept proxy format { success, data } or raw backend format { photos, albums, ... }
			const payload =
				data.success === true ? (data.data ?? data.results) : Array.isArray(data.photos) ? data : null;
			const hasValidPayload = payload && Array.isArray(payload.photos);
			if (response.ok && (data.success === true || hasValidPayload)) {
				const newResults =
					payload && typeof payload.totalPhotos === 'number'
						? payload
						: {
								photos: payload?.photos ?? [],
								albums: payload?.albums ?? [],
								people: payload?.people ?? [],
								locations: payload?.locations ?? [],
								totalPhotos: payload?.totalPhotos ?? 0,
								totalAlbums: payload?.totalAlbums ?? 0,
								totalPeople: payload?.totalPeople ?? 0,
								totalLocations: payload?.totalLocations ?? 0,
								page: payload?.page ?? 1,
								limit: payload?.limit ?? 20,
								hasMore: payload?.hasMore ?? false
							};

				if (append && results.photos) {
					results = {
						...newResults,
						photos: [...results.photos, ...(newResults.photos || [])]
					};
				} else {
					results = newResults;
				}

				currentPage = page;
				error = null;
			} else {
				error = (data && data.error) || (response.statusText && `HTTP ${response.status}`) || $t('search.error');
			}
		} catch (err) {
			error = err instanceof Error ? err.message : $t('search.error');
			logger.error('Search error:', err);
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

	function buildSearchUrl(nextFilters: AdvancedFilters, nextQuery?: string) {
		const params = new URLSearchParams();
		const q = nextQuery !== undefined ? nextQuery : query;
		if (q.trim()) params.set('q', q.trim());
		if (nextFilters.albumId) params.set('albumId', toIdString(nextFilters.albumId));
		if (nextFilters.tags.length > 0) params.set('tags', nextFilters.tags.map(toIdString).filter(Boolean).join(','));
		if (nextFilters.people.length > 0) params.set('people', nextFilters.people.map(toIdString).filter(Boolean).join(','));
		if (nextFilters.locationIds.length > 0) params.set('locationIds', nextFilters.locationIds.map(toIdString).filter(Boolean).join(','));
		if (nextFilters.dateFrom?.trim()) params.set('dateFrom', nextFilters.dateFrom.trim());
		if (nextFilters.dateTo?.trim()) params.set('dateTo', nextFilters.dateTo.trim());
		if (nextFilters.sortOrder && nextFilters.sortOrder !== 'desc') params.set('sortOrder', nextFilters.sortOrder);
		const search = params.toString();
		return `${$page.url.pathname}${search ? `?${search}` : ''}`;
	}

	function updateUrlFromFilters(nextFilters: AdvancedFilters) {
		goto(buildSearchUrl(nextFilters), { replaceState: true });
	}

	async function openFilterPanel() {
		showFilterPanel = true;
		draftFilters = { ...filters };
		if (filterOptions.albums.length === 0) {
			try {
				const [albumsRes, tagsRes, peopleRes, locationsRes] = await Promise.all([
					fetch('/api/albums/hierarchy?includePrivate=false', { credentials: 'include' }),
					fetch('/api/admin/tags?limit=500', { credentials: 'include' }),
					fetch('/api/admin/people?limit=500', { credentials: 'include' }),
					fetch('/api/admin/locations?limit=500', { credentials: 'include' })
				]);
				const albumsPayload = albumsRes.ok ? await albumsRes.json() : {};
				const tagsData = tagsRes.ok ? await tagsRes.json() : [];
				const peopleData = peopleRes.ok ? await peopleRes.json() : [];
				const locationsData = locationsRes.ok ? await locationsRes.json() : [];
				const albumsTree = Array.isArray(albumsPayload) ? albumsPayload : albumsPayload?.data ?? [];
				const tags = Array.isArray(tagsData) ? tagsData : tagsData?.data ?? [];
				const people = Array.isArray(peopleData) ? peopleData : peopleData?.data ?? [];
				const locations = Array.isArray(locationsData) ? locationsData : locationsData?.data ?? [];
				const flattenAlbums = (arr: any[], out: any[] = []): any[] => {
					for (const a of arr) {
						out.push({ _id: toIdString(a._id), name: typeof a.name === 'object' ? MultiLangUtils.getTextValue(a.name, $currentLanguage) : a.name });
						if (a.children?.length) flattenAlbums(a.children, out);
					}
					return out;
				};
				filterOptions = {
					albums: flattenAlbums(albumsTree),
					tags: tags.map((t: any) => ({ ...t, _id: toIdString(t._id) })),
					people: people.map((p: any) => ({ ...p, _id: toIdString(p._id) })),
					locations: locations.map((l: any) => ({ ...l, _id: toIdString(l._id) }))
				};
			} catch (e) {
				logger.error('Failed to load filter options', e);
			}
		}
	}

	function applyFilterPanel() {
		filters = { ...draftFilters };
		showFilterPanel = false;
		// Do not change the URL when applying filters; reactive block will run search (POST)
	}

	function getItemName(item: any): string {
		if (!item) return '';
		if (typeof item.name === 'string') return item.name;
		return MultiLangUtils.getTextValue(item.name || item.title || item.fullName || item.firstName || {}, $currentLanguage) || item._id || '';
	}

	/** Normalize any ID (string or ObjectId-like) to a string for URL/filter use. Prevents "[object Object]" when API returns _id as object. */
	function toIdString(id: any): string {
		if (id == null) return '';
		if (typeof id === 'string') return id;
		if (typeof id?.toString === 'function') {
			const s = id.toString();
			if (s && !s.startsWith('[object')) return s;
		}
		return String(id);
	}

	/** Build a short summary of the current search (query + active filters) for display in results header. */
	$: searchSummary = (function () {
		const parts: string[] = [];
		if (query?.trim()) parts.push(`"${query.trim()}"`);
		if (filters.albumId) {
			const album = filterOptions.albums.find((a) => toIdString(a._id) === toIdString(filters.albumId));
			parts.push(`${$t('search.album')}: ${getItemName(album) || filters.albumId}`);
		}
		if (filters.tags.length > 0) {
			const names = filters.tags
				.map((id) => getItemName(filterOptions.tags.find((t) => toIdString(t._id) === toIdString(id))) || id)
				.join(', ');
			parts.push(`${$t('search.tags')}: ${names}`);
		}
		if (filters.people.length > 0) {
			const names = filters.people
				.map((id) => getItemName(filterOptions.people.find((p) => toIdString(p._id) === toIdString(id))) || id)
				.join(', ');
			parts.push(`${$t('search.people')}: ${names}`);
		}
		if (filters.locationIds.length > 0) {
			const names = filters.locationIds
				.map((id) => getItemName(filterOptions.locations.find((l) => toIdString(l._id) === toIdString(id))) || id)
				.join(', ');
			parts.push(`${$t('search.locations')}: ${names}`);
		}
		return parts.join(' · ');
	})();
</script>

<div class="min-h-screen bg-gray-50">
	<div class="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-8">
		<!-- Search Bar + Filters -->
		<div class="mb-6 flex flex-wrap items-center gap-3">
			<div class="flex-1 min-w-[200px]">
				<SearchBar {query} {loading} on:search={(e) => handleSearch(e.detail)} />
			</div>
			<button
				type="button"
				on:click={openFilterPanel}
				class="px-4 py-2 text-sm font-medium text-gray-700 bg-white border border-gray-300 rounded-md hover:bg-gray-50 focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-blue-500"
			>
				{$t('search.filters') || 'Filters'}
			</button>
		</div>

		<!-- Active Filters Display -->
		{#if hasActiveFilters()}
			<div class="mb-4 flex flex-wrap gap-2">
				{#if filters.albumId}
					{@const albumName = filterOptions.albums.find((a) => toIdString(a._id) === toIdString(filters.albumId))?.name ?? filters.albumId}
					<span class="px-3 py-1 bg-blue-100 text-blue-800 rounded-full text-sm">
						{$t('search.album')}: {albumName}
						<button
							type="button"
							on:click={() => updateUrlFromFilters({ ...filters, albumId: null })}
							class="ml-2 hover:text-blue-900"
						>
							×
						</button>
					</span>
				{/if}
				{#each filters.tags as tagId}
					{@const tagName = filterOptions.tags.find((t) => toIdString(t._id) === toIdString(tagId))?.name ?? tagId}
					<span class="px-3 py-1 bg-blue-100 text-blue-800 rounded-full text-sm">
						{$t('search.tags')}: {tagName}
						<button
							type="button"
							on:click={() => updateUrlFromFilters({ ...filters, tags: filters.tags.filter((id) => toIdString(id) !== toIdString(tagId)) })}
							class="ml-2 hover:text-blue-900"
						>
							×
						</button>
					</span>
				{/each}
				{#each filters.people as personId}
					{@const personName = getItemName(filterOptions.people.find((p) => toIdString(p._id) === toIdString(personId))) || personId}
					<span class="px-3 py-1 bg-blue-100 rounded-full text-sm">
						<span class="text-blue-800">{$t('search.people')}: {personName}</span>
						<button
							type="button"
							on:click={() => updateUrlFromFilters({ ...filters, people: filters.people.filter((id) => toIdString(id) !== toIdString(personId)) })}
							class="ml-2 hover:text-blue-900"
						>
							×
						</button>
					</span>
				{/each}
				{#each filters.locationIds as locationId}
					{@const locName = getItemName(filterOptions.locations.find((l) => toIdString(l._id) === toIdString(locationId))) || locationId}
					<span class="px-3 py-1 bg-blue-100 text-blue-800 rounded-full text-sm">
						{$t('search.locations')}: {locName}
						<button
							type="button"
							on:click={() => updateUrlFromFilters({ ...filters, locationIds: filters.locationIds.filter((id) => toIdString(id) !== toIdString(locationId)) })}
							class="ml-2 hover:text-blue-900"
						>
							×
						</button>
					</span>
				{/each}
			</div>
		{/if}

		<!-- Filter Panel (drawer) -->
		{#if showFilterPanel}
			<div
				class="fixed inset-0 z-40 overflow-y-auto"
				aria-labelledby="filter-panel-title"
				role="dialog"
				aria-modal="true"
			>
				<div class="flex min-h-screen items-center justify-center p-4">
					<div
						class="fixed inset-0 bg-black/50 transition-opacity"
						on:click={() => (showFilterPanel = false)}
						on:keydown={(e) => e.key === 'Escape' && (showFilterPanel = false)}
						role="button"
						tabindex="-1"
						aria-label="Close"
					></div>
					<div class="relative bg-white rounded-lg shadow-xl max-w-md w-full p-6 max-h-[90vh] overflow-y-auto">
						<h2 id="filter-panel-title" class="text-lg font-semibold text-gray-900 mb-4">{$t('search.filters') || 'Filters'}</h2>
						<div class="space-y-4">
							<div>
								<label for="filter-album" class="block text-sm font-medium text-gray-700 mb-1">{$t('search.album') || 'Album'}</label>
								<select
									id="filter-album"
									class="w-full px-3 py-2 border border-gray-300 rounded-md text-sm text-gray-900"
									bind:value={draftFilters.albumId}
								>
									<option value="">— {$t('search.any') || 'Any'} —</option>
									{#each filterOptions.albums as album}
										<option value={album._id}>{getItemName(album)}</option>
									{/each}
								</select>
							</div>
							<div>
								<span class="block text-sm font-medium text-gray-700 mb-1">{$t('search.tags') || 'Tags'}</span>
								<div class="flex flex-wrap gap-2 max-h-32 overflow-y-auto p-2 border border-gray-300 rounded-md">
									{#each filterOptions.tags as tag}
										{@const tagId = toIdString(tag._id)}
										{@const checked = draftFilters.tags.includes(tagId)}
										<label class="inline-flex items-center gap-1 text-sm text-gray-900">
											<input
												type="checkbox"
												checked={checked}
												on:change={(e) => {
													if (e.currentTarget.checked) draftFilters = { ...draftFilters, tags: [...draftFilters.tags, tagId] };
													else draftFilters = { ...draftFilters, tags: draftFilters.tags.filter((id) => toIdString(id) !== tagId) };
												}}
											/>
											<span class="text-gray-900">{getItemName(tag)}</span>
										</label>
									{/each}
								</div>
							</div>
							<div>
								<span class="block text-sm font-medium text-gray-700 mb-1">{$t('search.people') || 'People'}</span>
								<div class="flex flex-wrap gap-2 max-h-32 overflow-y-auto p-2 border border-gray-300 rounded-md">
									{#each filterOptions.people as person}
										{@const personId = toIdString(person._id)}
										{@const checked = draftFilters.people.includes(personId)}
										<label class="inline-flex items-center gap-1 text-sm text-gray-900">
											<input
												type="checkbox"
												checked={checked}
												on:change={(e) => {
													if (e.currentTarget.checked) draftFilters = { ...draftFilters, people: [...draftFilters.people, personId] };
													else draftFilters = { ...draftFilters, people: draftFilters.people.filter((id) => toIdString(id) !== personId) };
												}}
											/>
											<span class="text-gray-900">{getItemName(person)}</span>
										</label>
									{/each}
								</div>
							</div>
							<div>
								<span class="block text-sm font-medium text-gray-700 mb-1">{$t('search.locations') || 'Locations'}</span>
								<div class="flex flex-wrap gap-2 max-h-32 overflow-y-auto p-2 border border-gray-300 rounded-md">
									{#each filterOptions.locations as loc}
										{@const locId = toIdString(loc._id)}
										{@const checked = draftFilters.locationIds.includes(locId)}
										<label class="inline-flex items-center gap-1 text-sm text-gray-900">
											<input
												type="checkbox"
												checked={checked}
												on:change={(e) => {
													if (e.currentTarget.checked) draftFilters = { ...draftFilters, locationIds: [...draftFilters.locationIds, locId] };
													else draftFilters = { ...draftFilters, locationIds: draftFilters.locationIds.filter((id) => toIdString(id) !== locId) };
												}}
											/>
											<span class="text-gray-900">{getItemName(loc)}</span>
										</label>
									{/each}
								</div>
							</div>
							<div class="grid grid-cols-2 gap-3">
								<div>
									<label for="filter-dateFrom" class="block text-sm font-medium text-gray-700 mb-1">{$t('search.dateFrom') || 'Date from'}</label>
									<input id="filter-dateFrom" type="date" class="w-full px-3 py-2 border border-gray-300 rounded-md text-sm text-gray-900" bind:value={draftFilters.dateFrom} />
								</div>
								<div>
									<label for="filter-dateTo" class="block text-sm font-medium text-gray-700 mb-1">{$t('search.dateTo') || 'Date to'}</label>
									<input id="filter-dateTo" type="date" class="w-full px-3 py-2 border border-gray-300 rounded-md text-sm text-gray-900" bind:value={draftFilters.dateTo} />
								</div>
							</div>
							<div>
								<label for="filter-sort" class="block text-sm font-medium text-gray-700 mb-1">{$t('search.sort') || 'Sort'}</label>
								<select id="filter-sort" class="w-full px-3 py-2 border border-gray-300 rounded-md text-sm text-gray-900" bind:value={draftFilters.sortOrder}>
									<option value="desc">{$t('search.newestFirst') || 'Newest first'}</option>
									<option value="asc">{$t('search.oldestFirst') || 'Oldest first'}</option>
								</select>
							</div>
						</div>
						<div class="mt-6 flex justify-end gap-2">
							<button
								type="button"
								on:click={() => (showFilterPanel = false)}
								class="px-4 py-2 text-sm font-medium text-gray-700 bg-gray-100 rounded-md hover:bg-gray-200"
							>
								{$t('search.cancel') || 'Cancel'}
							</button>
							<button
								type="button"
								on:click={applyFilterPanel}
								class="px-4 py-2 text-sm font-medium text-white bg-blue-600 rounded-md hover:bg-blue-700"
							>
								{$t('search.apply') || 'Apply'}
							</button>
						</div>
					</div>
				</div>
			</div>
		{/if}

		<!-- Search Results -->
		<SearchResults {results} {loading} {error} {query} searchSummary={searchSummary} on:loadMore={handleLoadMore} />
	</div>
</div>
