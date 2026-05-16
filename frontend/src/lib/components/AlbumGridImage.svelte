<script lang="ts">
	import { createEventDispatcher } from 'svelte';

	const dispatch = createEventDispatcher<{ load: Event; error: Event }>();

	/** Grid cell index (0 = first visible tile). First few load eagerly with higher priority. */
	export let index = 0;
	export let src = '';
	export let alt = '';
	export let className = '';
	export let style = '';
	export let draggable: boolean | undefined = undefined;

	const EAGER_COUNT = 8;

	$: loading = index < EAGER_COUNT ? 'eager' : 'lazy';
	$: fetchPriority = index < 4 ? 'high' : index < EAGER_COUNT ? 'auto' : 'low';
</script>

{#if src}
	<img
		{src}
		{alt}
		class={className}
		{style}
		{draggable}
		loading={loading}
		decoding="async"
		fetchpriority={fetchPriority}
		on:load={(e) => dispatch('load', e)}
		on:error={(e) => dispatch('error', e)}
	/>
{/if}
