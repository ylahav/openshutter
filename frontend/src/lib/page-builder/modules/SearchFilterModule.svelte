<script lang="ts">
	import SearchFilter from '$lib/components/search/SearchFilter.svelte';
	import { searchModulesState, type SearchModuleFilters } from '$lib/components/search/search-modules-store';

	export let showFiltersButton = true;
	export let buttonClass = '';
	export let chipsWrapClass = '';

	let filters: SearchModuleFilters = {
		albumId: null,
		tags: [],
		people: [],
		locationIds: [],
		dateFrom: '',
		dateTo: '',
		sortOrder: 'desc'
	};

	searchModulesState.subscribe((state) => {
		filters = state.filters;
	});
</script>

<div class="os-search-filter-module w-full">
	<SearchFilter
		{filters}
		{showFiltersButton}
		{buttonClass}
		{chipsWrapClass}
		on:change={(e) => searchModulesState.update((state) => ({ ...state, filters: e.detail }))}
	/>
</div>
