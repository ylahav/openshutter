<script lang="ts">
	import BaseSearchFilterModule from '$lib/page-builder/modules/SearchFilterModule.svelte';

	let {
		showFiltersButton = $bindable(true),
		buttonClass = $bindable(''),
		chipsWrapClass = $bindable('')
	}: {
		showFiltersButton?: unknown;
		buttonClass?: unknown;
		chipsWrapClass?: unknown;
	} = $props();
</script>

<BaseSearchFilterModule {showFiltersButton} {buttonClass} {chipsWrapClass} />
