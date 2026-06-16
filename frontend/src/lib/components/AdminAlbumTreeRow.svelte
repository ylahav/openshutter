<script lang="ts">
	import AdminAlbumTreeRow from './AdminAlbumTreeRow.svelte';
	import { dragHandle } from 'svelte-dnd-action';
	import { getAlbumName } from '$lib/utils/albumUtils';
	import { t } from '$stores/i18n';

	interface AlbumTreeNode {
		_id: string;
		name: string | { en?: string; he?: string };
		alias: string;
		parentAlbumId?: string | null;
		level: number;
		order: number;
		photoCount?: number;
		isPublic?: boolean;
		isPublished?: boolean;
		isFeatured?: boolean;
		allowedGroups?: string[];
		allowedUsers?: string[];
		childAlbumCount?: number;
		updatedAt?: string;
		children: AlbumTreeNode[];
	}

	let {
		node,
		depth = 0,
		expandedNodes,
		showAccordion = true,
		reorderEnabled = false,
		flatMode = false,
		onToggle,
		onOpen,
		renderActions = undefined,
		isExpanded = false,
	}: {
		node: AlbumTreeNode;
		depth?: number;
		expandedNodes: Set<string>;
		showAccordion?: boolean;
		reorderEnabled?: boolean;
		/** When true, children are rendered by the flat list — do not recurse. */
		flatMode?: boolean;
		onToggle: (nodeId: string) => void;
		onOpen: (node: AlbumTreeNode) => void;
		renderActions?: ((node: AlbumTreeNode) => any) | undefined;
		/** Parent-computed expand state (avoids Set prop reactivity issues). */
		isExpanded?: boolean;
	} = $props();

	const nodeId = $derived(String(node._id));
	const hasChildren = $derived(
		flatMode
			? Boolean((node as { hasChildNodes?: boolean }).hasChildNodes) ||
					(node.childAlbumCount ?? 0) > 0
			: node.children.length > 0 || (node.childAlbumCount ?? 0) > 0
	);
	const rowExpanded = $derived(isExpanded);
</script>

<!-- pointer-events: none on the dnd row wrapper; interactive children opt back in -->
<div
	class="album-tree-node {reorderEnabled ? 'album-tree-node--dnd' : ''}"
	style="padding-left: {depth * 1.5}rem;"
	data-id={nodeId}
>
	<div class="group flex items-center gap-2 rounded-md px-3 py-2 hover:bg-gray-50">
		{#if showAccordion && hasChildren}
			<button
				type="button"
				onpointerdown={(e) => e.stopPropagation()}
				onmousedown={(e) => e.stopPropagation()}
				onclick={(e) => {
					e.preventDefault();
					e.stopPropagation();
					onToggle(nodeId);
				}}
				class="album-tree-interactive flex h-6 w-6 shrink-0 items-center justify-center text-gray-400 hover:text-gray-600"
				aria-expanded={rowExpanded}
				aria-label={rowExpanded ? 'Collapse' : 'Expand'}
			>
				<svg
					class="h-4 w-4 transition-transform {rowExpanded ? 'rotate-90' : ''}"
					fill="none"
					viewBox="0 0 24 24"
					stroke="currentColor"
				>
					<path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M9 5l7 7-7 7" />
				</svg>
			</button>
		{:else}
			<div class="w-6"></div>
		{/if}

		<div class="flex min-w-0 flex-1 items-center gap-3">
			{#if reorderEnabled}
				<div
					use:dragHandle
					class="drag-handle flex shrink-0 cursor-grab items-center justify-center rounded border border-gray-300 p-1.5 text-gray-600 transition-colors hover:bg-gray-200 hover:text-gray-800 active:cursor-grabbing"
					title={$t('admin.albumsListDragToReorder')}
					style="user-select: none; min-width: 28px; height: 28px; touch-action: none;"
				>
					<span class="text-base font-bold leading-none text-gray-600" style="line-height: 1;">⋮⋮</span>
				</div>
			{/if}
			<div
				onclick={(e) => {
					e.stopPropagation();
					onOpen(node);
				}}
				onkeydown={(e) => {
					e.stopPropagation();
					if (e.key === 'Enter' || e.key === ' ') {
						e.preventDefault();
						onOpen(node);
					}
				}}
				class="album-tree-interactive min-w-0 flex-1 cursor-pointer text-left"
				role="button"
				tabindex="0"
			>
				<div class="min-w-0 flex-1">
					<div class="flex flex-wrap items-center gap-2">
						<span class="truncate font-medium text-gray-900">{getAlbumName(node)}</span>
						{#if node.isFeatured}
							<span
								class="inline-flex items-center rounded bg-yellow-100 px-2 py-0.5 text-xs font-medium text-yellow-800"
								title={$t('admin.featured')}
							>
								⭐ {$t('admin.featured')}
							</span>
						{/if}
						{#if (node.allowedGroups ?? []).length > 0}
							<span
								class="inline-flex items-center rounded bg-blue-50 px-2 py-0.5 text-xs font-medium text-blue-800"
								title="Restricted to groups: {(node.allowedGroups ?? []).join(', ')}"
							>
								Group: {(node.allowedGroups ?? []).join(', ')}
							</span>
						{/if}
						{#if (node.allowedUsers ?? []).length > 0}
							<span
								class="inline-flex items-center rounded bg-indigo-50 px-2 py-0.5 text-xs font-medium text-indigo-800"
								title="Restricted to specific users"
							>
								Users
							</span>
						{/if}
					</div>
					<div class="text-sm text-gray-500">
						{(node.photoCount || 0).toLocaleString()}
						{(node.photoCount || 0) === 1 ? $t('admin.photoSingular') : $t('admin.photosPlural')}
						{#if (node.childAlbumCount ?? 0) > 0}
							<span>
								{' · '}
								{(node.childAlbumCount ?? 0) === 1
									? $t('admin.albumsListSubAlbumOne')
									: $t('admin.albumsListSubAlbumsMany').replace(
											'{count}',
											String(node.childAlbumCount ?? 0)
										)}
							</span>
						{/if}
					</div>
				</div>
			</div>

			<div class="shrink-0 self-center">
				{#if node.isPublished === false}
					<span
						class="inline-flex items-center rounded-full bg-(--color-surface-200-600) px-2.5 py-0.5 text-xs font-medium text-(--color-surface-800-200)"
					>
						{$t('admin.dashboardDraft')}
					</span>
				{:else if node.isPublic !== true}
					<span
						class="inline-flex items-center rounded-full bg-amber-100 px-2.5 py-0.5 text-xs font-medium text-amber-900 dark:bg-amber-900/40 dark:text-amber-100"
					>
						{$t('admin.private')}
					</span>
				{:else}
					<span
						class="inline-flex items-center rounded-full bg-emerald-100 px-2.5 py-0.5 text-xs font-medium text-emerald-900 dark:bg-emerald-900/50 dark:text-emerald-100"
					>
						{$t('admin.dashboardPublished')}
					</span>
				{/if}
			</div>

			{#if renderActions}
				<div
					class="album-tree-interactive shrink-0 opacity-0 transition-opacity group-hover:opacity-100"
					role="group"
					aria-label="Album actions"
				>
					{@html renderActions(node)}
				</div>
			{/if}
		</div>
	</div>
</div>

{#if !flatMode && rowExpanded && node.children.length > 0}
	{#each node.children as child (String(child._id))}
		<AdminAlbumTreeRow
			node={child}
			depth={depth + 1}
			{expandedNodes}
			{showAccordion}
			{reorderEnabled}
			isExpanded={expandedNodes.has(String(child._id))}
			{onToggle}
			{onOpen}
			{renderActions}
		/>
	{/each}
{/if}

<style>
	/* Let drag-and-drop own the row shell; only handles/buttons receive clicks */
	.album-tree-node--dnd {
		pointer-events: none;
	}

	.album-tree-node--dnd :global(.album-tree-interactive),
	.album-tree-node--dnd :global(.drag-handle) {
		pointer-events: auto;
	}
</style>
