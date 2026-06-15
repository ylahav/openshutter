<script lang="ts">
	import BaseSearchResultsModule from '$lib/page-builder/modules/SearchResultsModule.svelte';

	let {
		limit = $bindable(20),
		showSearchSummary = $bindable(true)
	}: {
		limit?: unknown;
		showSearchSummary?: unknown;
	} = $props();
</script>

<BaseSearchResultsModule {limit} {showSearchSummary} />
