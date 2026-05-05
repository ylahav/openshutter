<script lang="ts">
	import './styles/styles.scss';
	import AdvancedFilterSearch from '$lib/components/search/AdvancedFilterSearch.svelte';

	export let initialQuery = '';
	export let variant: 'noir' | 'default' = 'default';
</script>

<div
	class="min-h-screen w-full bg-(--tp-canvas) text-(--tp-fg) [font-family:var(--os-font-body)] pt-24 pb-16"
>
	<div class="max-w-(--os-max-width) mx-auto px-7">
		<AdvancedFilterSearch {initialQuery} {variant} />
	</div>
</div>
