<script lang="ts">
	import { browser } from '$app/environment';
	import { activeTemplate } from '$stores/template';
	import SearchResults from '$lib/components/search/SearchResults.svelte';
	import { logger } from '$lib/utils/logger';
	import {
		searchModulesState,
		hasActiveSearchFilters,
		type SearchModuleFilters
	} from '$lib/components/search/search-modules-store';

	const templateSearchResultsStyleLoaders = import.meta.glob('/src/templates/*/styles/_searchResults.scss');
	const defaultSearchResultsStyleLoaders = import.meta.glob('/src/lib/page-builder/modules/SearchResults/_styles.scss');
	const loadedTemplateSearchResultsStyles = new Set<string>();

	interface SearchResultPayload {
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

	let query = '';
	export let limit = 20;
	export let showSearchSummary = true;
	$: pageSize = Math.max(1, Number(limit) || 20);

	let filters: SearchModuleFilters = {
		albumId: null,
		tags: [],
		people: [],
		locationIds: [],
		dateFrom: '',
		dateTo: '',
		sortOrder: 'desc'
	};
	let results: SearchResultPayload = {
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

	$: if (browser) {
		const templateId = String($activeTemplate || '').trim().toLowerCase();
		const templateStylePath = `/src/templates/${templateId}/styles/_searchResults.scss`;
		const defaultStylePath = '/src/lib/page-builder/modules/SearchResults/_styles.scss';
		const styleKey = templateId && templateSearchResultsStyleLoaders[templateStylePath]
			? templateStylePath
			: defaultStylePath;

		if (!loadedTemplateSearchResultsStyles.has(styleKey)) {
			const loader =
				templateSearchResultsStyleLoaders[templateStylePath] ||
				defaultSearchResultsStyleLoaders[defaultStylePath];
			if (loader) {
				void loader();
				loadedTemplateSearchResultsStyles.add(styleKey);
			}
		}
	}

	const unsubscribe = searchModulesState.subscribe((state) => {
		query = state.query;
		filters = state.filters;
		triggerSearch();
	});

	function toIdString(id: any): string {
		if (id == null) return '';
		if (typeof id === 'string') return id;
		if (typeof id?.toString === 'function') {
			const s = id.toString();
			if (s && !s.startsWith('[object')) return s;
		}
		return String(id);
	}

	function resetResults() {
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
			limit: pageSize,
			hasMore: false
		};
	}

	function triggerSearch() {
		if (searchTimeout) clearTimeout(searchTimeout);
		searchTimeout = setTimeout(() => {
			currentPage = 1;
			void performSearch(1, false);
		}, 300);
	}

	async function performSearch(page = 1, append = false) {
		if (!query.trim() && !hasActiveSearchFilters(filters)) {
			resetResults();
			error = null;
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
				limit: pageSize,
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
				error = response.ok ? 'Search failed.' : `Search failed: ${response.status} ${response.statusText}`;
				return;
			}

			const payload =
				data.success === true ? (data.data ?? data.results) : Array.isArray(data.photos) ? data : null;
			const hasValidPayload = payload && Array.isArray(payload.photos);

			if (response.ok && (data.success === true || hasValidPayload)) {
				const newResults: SearchResultPayload =
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

				if (append) {
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
				error = (data && data.error) || (response.statusText && `HTTP ${response.status}`) || 'Search failed.';
			}
		} catch (err) {
			error = err instanceof Error ? err.message : 'Search failed.';
			logger.error('Search error:', err);
		} finally {
			loading = false;
		}
	}

	function handleLoadMore() {
		if (!loading && results.hasMore) {
			void performSearch(currentPage + 1, true);
		}
	}

	$: searchSummary = showSearchSummary && query?.trim() ? `"${query.trim()}"` : '';
</script>

<SearchResults {results} {loading} {error} {query} {searchSummary} on:loadMore={handleLoadMore} />
