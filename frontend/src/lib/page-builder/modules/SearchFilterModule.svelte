<script lang="ts">
	import SearchFilter from '$lib/components/search/SearchFilter.svelte';
	import { searchModulesState } from '$lib/components/search/search-modules-store';

	let {
		showFiltersButton = true,
		buttonClass = '',
		chipsWrapClass = ''
	}: {
		showFiltersButton?: boolean;
		buttonClass?: string;
		chipsWrapClass?: string;
	} = $props();

	const filters = $derived($searchModulesState.filters);

	function handleChange(detail: typeof $searchModulesState.filters) {
		searchModulesState.update((state) => ({ ...state, filters: detail }));
	}
</script>

<div class="os-search-filter-module w-full">
	<SearchFilter
		{filters}
		{showFiltersButton}
		{buttonClass}
		{chipsWrapClass}
		onchange={handleChange}
	/>
</div>
