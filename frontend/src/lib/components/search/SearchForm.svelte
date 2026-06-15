<script lang="ts">
	import SearchBar from './SearchBar.svelte';
	import SearchFilter from './SearchFilter.svelte';
	import type { SearchModuleFilters } from './search-modules-store';

	let {
		query = '',
		loading = false,
		placeholder = '',
		showFiltersButton = true,
		filterWrapClass = '',
		filters = null,
		onsearch = undefined,
		onfilters = undefined,
		onfiltersChange = undefined
	}: {
		query?: string;
		loading?: boolean;
		placeholder?: string;
		showFiltersButton?: boolean;
		filterWrapClass?: string;
		filters?: SearchModuleFilters | null;
		onsearch?: (value: string) => void;
		onfilters?: () => void;
		onfiltersChange?: (detail: SearchModuleFilters) => void;
	} = $props();
</script>

<div class={`os-search-form mb-6 flex flex-wrap items-center gap-3 ${filterWrapClass}`.trim()}>
	<div class="os-search-form__input flex-1 min-w-[200px]">
		<SearchBar {query} {loading} {placeholder} {onsearch} />
	</div>
	{#if filters}
		<SearchFilter
			{filters}
			{showFiltersButton}
			buttonClass="os-search-form__filters-btn"
			onchange={onfiltersChange}
		/>
	{:else if showFiltersButton}
		<button
			type="button"
			onclick={() => onfilters?.()}
			class="os-search-form__filters-btn px-4 py-2 text-sm font-medium text-gray-700 bg-white border border-gray-300 rounded-md hover:bg-gray-50 focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-blue-500"
		>
			Filters
		</button>
	{/if}
</div>
