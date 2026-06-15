<script lang="ts">
	import SearchBar from '$lib/components/search/SearchBar.svelte';
	import { searchModulesState } from '$lib/components/search/search-modules-store';

	let { placeholder = '' }: { placeholder?: string } = $props();

	let loading = $state(false);
	const query = $derived($searchModulesState.query);

	function handleSearch(value: string) {
		searchModulesState.update((state) => ({ ...state, query: value }));
	}
</script>

<div class="os-search-bar-module w-full">
	<SearchBar
		{query}
		{loading}
		{placeholder}
		onsearch={handleSearch}
	/>
</div>
