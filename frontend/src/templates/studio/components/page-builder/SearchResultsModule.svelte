<script lang="ts">
	import BaseSearchResultsModule from '$lib/page-builder/modules/SearchResultsModule.svelte';

	export let limit = 20;
	export let showSearchSummary = true;
</script>

<BaseSearchResultsModule {limit} {showSearchSummary} />
