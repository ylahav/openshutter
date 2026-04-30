<script lang="ts">
	import { createEventDispatcher } from 'svelte';
	import SearchBar from './SearchBar.svelte';
	import SearchFilter from './SearchFilter.svelte';
	import type { SearchModuleFilters } from './search-modules-store';

	export let query = '';
	export let loading = false;
	export let placeholder = '';
	export let showFiltersButton = true;
	export let filterWrapClass = '';
	export let filters: SearchModuleFilters | null = null;

	const dispatch = createEventDispatcher<{
		search: string;
		filters: void;
		filtersChange: SearchModuleFilters;
	}>();
</script>

<div class={`os-search-form mb-6 flex flex-wrap items-center gap-3 ${filterWrapClass}`.trim()}>
	<div class="os-search-form__input flex-1 min-w-[200px]">
		<SearchBar {query} {loading} {placeholder} on:search={(e) => dispatch('search', e.detail)} />
	</div>
	{#if filters}
		<SearchFilter
			{filters}
			{showFiltersButton}
			buttonClass="os-search-form__filters-btn"
			on:change={(e) => dispatch('filtersChange', e.detail)}
		/>
	{:else if showFiltersButton}
		<button
			type="button"
			on:click={() => dispatch('filters')}
			class="os-search-form__filters-btn px-4 py-2 text-sm font-medium text-gray-700 bg-white border border-gray-300 rounded-md hover:bg-gray-50 focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-blue-500"
		>
			Filters
		</button>
	{/if}
</div>
