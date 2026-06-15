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
	class="min-h-screen w-full bg-(--tp-canvas) text-(--tp-fg) [font-family:var(--os-font-body)] pt-20 pb-16"
>
	<div class="max-w-[960px] mx-auto px-8">
		<AdvancedFilterSearch {initialQuery} {variant} />
	</div>
</div>
