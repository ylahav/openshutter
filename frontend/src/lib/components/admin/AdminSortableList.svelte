<script lang="ts">
	import { flip } from 'svelte/animate';
	import { dndzone } from 'svelte-dnd-action';
	import { adminBorderDefault, adminTextMuted } from '$lib/admin/admin-cerberus';

	type SortableItem = { id: string } & Record<string, unknown>;

	let {
		items = $bindable([] as SortableItem[]),
		disabled = $bindable(false),
		flipDurationMs = $bindable(200),
		type = undefined,
		onreorder = undefined,
		children
	}: {
		items?: SortableItem[];
		disabled?: boolean;
		flipDurationMs?: number;
		type?: string;
		onreorder?: (event: { detail: { items: SortableItem[] } }) => void;
		children: import('svelte').Snippet<[{ item: SortableItem }]>;
	} = $props();

	function handleConsider(e: CustomEvent<{ items: SortableItem[] }>) {
		if (disabled) return;
		items = e.detail.items;
	}

	function handleFinalize(e: CustomEvent<{ items: SortableItem[] }>) {
		if (disabled) return;
		items = e.detail.items;
		onreorder?.({ detail: { items } });
	}

	const zoneOptions = $derived({
		items,
		flipDurationMs,
		dragDisabled: disabled,
		...(type !== undefined ? { type } : {}),
	});
</script>

<ul
	class="list-none space-y-1 rounded-lg border p-2 {adminBorderDefault}"
	data-testid="admin-sortable-list"
	aria-label="Reorderable list"
	use:dndzone={zoneOptions}
	onconsider={handleConsider}
	onfinalize={handleFinalize}
>
	{#each items as item (item.id)}
		<li
			class="rounded-md border bg-(--color-surface-50-950) px-3 py-2 {adminBorderDefault} {disabled
				? 'opacity-60'
				: ''}"
			animate:flip={{ duration: flipDurationMs }}
		>
			{@render children({ item })}
		</li>
	{/each}
</ul>

{#if items.length === 0}
	<p class="mt-2 text-sm {adminTextMuted}">No items.</p>
{/if}
