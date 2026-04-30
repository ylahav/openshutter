<script lang="ts">
	import BaseSearchFilterModule from '$lib/page-builder/modules/SearchFilterModule.svelte';

	export let showFiltersButton = true;
	export let buttonClass = '';
	export let chipsWrapClass = '';
</script>

<BaseSearchFilterModule {showFiltersButton} {buttonClass} {chipsWrapClass} />
