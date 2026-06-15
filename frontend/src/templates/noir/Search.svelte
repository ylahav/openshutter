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

<div class="min-h-screen w-full bg-(--tp-canvas) text-(--tp-fg) [font-family:var(--os-font-body)] px-8 py-16">
	<div class="max-w-4xl mx-auto">
		<p class="text-[9px] uppercase tracking-[0.28em] text-(--tp-fg-subtle) mb-6">search</p>
		<AdvancedFilterSearch {initialQuery} {variant} />
	</div>
</div>
