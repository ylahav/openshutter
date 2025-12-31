<script lang="ts">
	import { page } from '$app/stores';
	import { t } from '$stores/i18n';
	import AdvancedFilterSearch from '$lib/components/search/AdvancedFilterSearch.svelte';

	let initialQuery = $page.url.searchParams.get('q') || '';
</script>

<svelte:head>
	<title>{$t('search.title')} - OpenShutter</title>
</svelte:head>

<AdvancedFilterSearch {initialQuery} />
