<script lang="ts">
	import './styles/styles.scss';
	import AdvancedFilterSearch from '$lib/components/search/AdvancedFilterSearch.svelte';

	export let initialQuery = '';
	export let variant: 'noir' | 'default' = 'default';
</script>

<div class="min-h-screen w-full bg-[color:var(--tp-canvas)] text-[color:var(--tp-fg)] [font-family:var(--os-font-body)] px-8 py-16">
	<div class="max-w-4xl mx-auto">
		<p class="text-[9px] uppercase tracking-[0.28em] text-[color:var(--tp-fg-subtle)] mb-6">search</p>
		<AdvancedFilterSearch {initialQuery} {variant} />
	</div>
</div>
