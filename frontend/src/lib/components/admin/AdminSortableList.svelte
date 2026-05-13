<script lang="ts">
	import { flip } from 'svelte/animate';
	import { createEventDispatcher } from 'svelte';
	import { dndzone } from 'svelte-dnd-action';
	import { adminBorderDefault, adminTextMuted } from '$lib/admin/admin-cerberus';

	/** Each row must include a stable string `id` (required by `svelte-dnd-action`). */
	export let items: Array<{ id: string } & Record<string, unknown>>;
	/** When true, skip drag behavior (list still renders). */
	export let disabled = false;
	export let flipDurationMs = 200;
	/** Passed through to `dndzone` (see library README). */
	export let type: string | undefined = undefined;

	const dispatch = createEventDispatcher<{ reorder: { items: typeof items } }>();

	function handleConsider(e: CustomEvent<{ items: typeof items }>) {
		if (disabled) return;
		items = e.detail.items;
	}

	function handleFinalize(e: CustomEvent<{ items: typeof items }>) {
		if (disabled) return;
		items = e.detail.items;
		dispatch('reorder', { items });
	}

	$: zoneOptions = {
		items,
		flipDurationMs,
		dragDisabled: disabled,
		...(type !== undefined ? { type } : {}),
	};
</script>

<ul
	class="list-none space-y-1 rounded-lg border p-2 {adminBorderDefault}"
	data-testid="admin-sortable-list"
	aria-label="Reorderable list"
	use:dndzone={zoneOptions}
	on:consider={handleConsider}
	on:finalize={handleFinalize}
>
	{#each items as item (item.id)}
		<li
			class="rounded-md border bg-(--color-surface-50-950) px-3 py-2 {adminBorderDefault} {disabled
				? 'opacity-60'
				: ''}"
			animate:flip={{ duration: flipDurationMs }}
		>
			<slot {item} />
		</li>
	{/each}
</ul>

{#if items.length === 0}
	<p class="mt-2 text-sm {adminTextMuted}">No items.</p>
{/if}
