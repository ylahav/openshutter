<script lang="ts">
	import './styles/styles.scss';
	import AdvancedFilterSearch from '$lib/components/search/AdvancedFilterSearch.svelte';

	let {
		initialQuery = $bindable(''),
		variant = 'default'
	}: {
		initialQuery?: unknown;
		variant?: 'noir' | 'default';
	} = $props();
</script>

<div
	class="min-h-screen w-full bg-(--tp-canvas) text-(--tp-fg) [font-family:var(--os-font-body)] pt-24 pb-16"
>
	<div class="max-w-(--os-max-width) mx-auto px-7">
		<AdvancedFilterSearch {initialQuery} {variant} />
	</div>
</div>
