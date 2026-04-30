<script lang="ts">
	import SearchBar from '$lib/components/search/SearchBar.svelte';
	import { searchModulesState } from '$lib/components/search/search-modules-store';

	export let placeholder = '';

	let query = '';
	let loading = false;
	searchModulesState.subscribe((state) => {
		query = state.query;
	});
</script>

<div class="os-search-bar-module w-full">
	<SearchBar
		{query}
		{loading}
		{placeholder}
		on:search={(e) => searchModulesState.update((state) => ({ ...state, query: e.detail }))}
	/>
</div>
