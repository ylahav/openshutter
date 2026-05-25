<script lang="ts">
	import StorageRestoreAlbumTreeNode from './StorageRestoreAlbumTreeNode.svelte';
	import type { StorageRestoreAlbumItem } from './StorageRestoreAlbumsPreviewDialog.svelte';

	export type AlbumTreeNode = {
		item: StorageRestoreAlbumItem;
		children: AlbumTreeNode[];
	};

	export let node: AlbumTreeNode;
	export let depth = 0;
	export let expandedIds: Set<string>;
	export let selectedIds: Set<string>;
	export let onToggleSelect: (id: string) => void;
	export let onToggleExpand: (id: string) => void;

	$: hasChildren = node.children.length > 0;
	$: isExpanded = expandedIds.has(node.item.id);
	$: isExisting = node.item.status === 'exists';
	$: isSelected = selectedIds.has(node.item.id);
</script>

<li role="treeitem" aria-expanded={hasChildren ? isExpanded : undefined} class="list-none">
	<div
		class="flex items-center gap-2 rounded py-1.5 pr-2 hover:bg-(--color-surface-100-900)"
		style="padding-left: {depth * 1.25 + 0.5}rem"
	>
		{#if hasChildren}
			<button
				type="button"
				class="flex h-6 w-6 shrink-0 items-center justify-center rounded text-(--color-surface-600-400) hover:bg-(--color-surface-200-800)"
				aria-label={isExpanded ? 'Collapse' : 'Expand'}
				on:click={() => onToggleExpand(node.item.id)}
			>
				<svg
					class="h-4 w-4 transition-transform {isExpanded ? 'rotate-90' : ''}"
					fill="none"
					viewBox="0 0 24 24"
					stroke="currentColor"
					stroke-width="2"
				>
					<path stroke-linecap="round" stroke-linejoin="round" d="M9 5l7 7-7 7" />
				</svg>
			</button>
		{:else}
			<span class="w-6 shrink-0" aria-hidden="true"></span>
		{/if}

		<span class="flex h-6 w-6 shrink-0 items-center justify-center">
			{#if isExisting}
				<span
					class="flex h-5 w-5 items-center justify-center rounded-full bg-success-500/15 text-success-600"
					title="Already in database"
					aria-label="Already in database"
				>
					<svg class="h-3.5 w-3.5" fill="none" viewBox="0 0 24 24" stroke="currentColor" stroke-width="3">
						<path stroke-linecap="round" stroke-linejoin="round" d="M5 13l4 4L19 7" />
					</svg>
				</span>
			{:else}
				<input
					type="checkbox"
					class="h-4 w-4 rounded border-surface-300-700"
					checked={isSelected}
					aria-label="Select {node.item.folderName} for creation"
					on:change={() => onToggleSelect(node.item.id)}
				/>
			{/if}
		</span>

		<span class="min-w-0 flex-1">
			<span class="font-medium text-(--color-surface-900-100)">{node.item.folderName}</span>
			{#if node.item.proposedAlias && !isExisting}
				<span class="ml-2 text-xs text-(--color-surface-600-400)">→ {node.item.proposedAlias}</span>
			{/if}
			<span class="block truncate font-mono text-xs text-(--color-surface-600-400)">{node.item.storagePath}</span>
		</span>
	</div>

	{#if hasChildren && isExpanded}
		<ul role="group" class="space-y-0.5">
			{#each node.children as child (child.item.id)}
				<StorageRestoreAlbumTreeNode
					node={child}
					depth={depth + 1}
					{expandedIds}
					{selectedIds}
					{onToggleSelect}
					{onToggleExpand}
				/>
			{/each}
		</ul>
	{/if}
</li>
