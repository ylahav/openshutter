<script lang="ts">
	import BaseSearchFormModule from '$lib/page-builder/modules/SearchFormModule.svelte';

	let {
		placeholder = $bindable(''),
		showFiltersButton = $bindable(true),
		filterWrapClass = $bindable('')
	}: {
		placeholder?: unknown;
		showFiltersButton?: unknown;
		filterWrapClass?: unknown;
	} = $props();
</script>

<BaseSearchFormModule {placeholder} {showFiltersButton} {filterWrapClass} />
