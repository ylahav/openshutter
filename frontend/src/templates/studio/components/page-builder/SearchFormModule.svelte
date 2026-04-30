<script lang="ts">
	import BaseSearchFormModule from '$lib/page-builder/modules/SearchFormModule.svelte';

	export let placeholder = '';
	export let showFiltersButton = true;
	export let filterWrapClass = '';
</script>

<BaseSearchFormModule {placeholder} {showFiltersButton} {filterWrapClass} />
