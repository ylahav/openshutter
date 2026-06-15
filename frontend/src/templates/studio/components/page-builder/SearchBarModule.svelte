<script lang="ts">
	import BaseSearchBarModule from '$lib/page-builder/modules/SearchBarModule.svelte';

	let {
		placeholder = $bindable('')
	}: {
		placeholder?: unknown;
	} = $props();
</script>

<BaseSearchBarModule {placeholder} />
