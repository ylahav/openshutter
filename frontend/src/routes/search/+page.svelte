<script lang="ts">
	import { page } from '$app/stores';
	import { t } from '$stores/i18n';
	import { productName } from '$stores/siteConfig';
	import AdvancedFilterSearch from '$lib/components/search/AdvancedFilterSearch.svelte';

	let initialQuery = $page.url.searchParams.get('q') || '';
</script>

<svelte:head>
	<title>{$t('search.title')} - {$productName}</title>
</svelte:head>

<AdvancedFilterSearch {initialQuery} />
