<script lang="ts">
	import { page } from '$app/stores';
	import AdvancedFilterSearch from '$lib/components/search/AdvancedFilterSearch.svelte';

	let initialQuery = $page.url.searchParams.get('q') || '';
</script>

<svelte:head>
	<title>Search - OpenShutter</title>
</svelte:head>

<AdvancedFilterSearch {initialQuery} />
