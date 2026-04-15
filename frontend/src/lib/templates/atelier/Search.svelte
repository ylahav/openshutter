<script lang="ts">
	import './styles.scss';
	import AdvancedFilterSearch from '$lib/components/search/AdvancedFilterSearch.svelte';

	export let initialQuery = '';
	export let variant: 'noir' | 'default' = 'default';
</script>

<div
	class="min-h-screen w-full bg-[color:var(--tp-canvas)] text-[color:var(--tp-fg)] [font-family:var(--os-font-body)] pt-20 pb-16"
>
	<div class="max-w-[960px] mx-auto px-8">
		<AdvancedFilterSearch {initialQuery} {variant} />
	</div>
</div>
