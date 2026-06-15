<script lang="ts">
	import { onMount } from 'svelte';
	import { t } from '$stores/i18n';
	import { goto } from '$app/navigation';
	import { dndzone } from 'svelte-dnd-action';
	import { getAlbumName } from '$lib/utils/albumUtils';
	import { logger } from '$lib/utils/logger';

	interface Album {
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
	}

	interface AlbumTreeNode extends Album {
		children: AlbumTreeNode[];
	}

	let {
		albums = [],
		onReorder = undefined,
		renderActions = undefined,
		onOpen = undefined,
		showAccordion = true,
		expandAllByDefault = false,
		clientSortBy = 'manual' as 'manual' | 'name' | 'date'
	}: {
		albums?: Album[];
		onReorder?:
			| ((updates: Array<{ id: string; parentAlbumId: string | null; order: number }>) => Promise<void>)
			| undefined;
		renderActions?: ((node: AlbumTreeNode) => any) | undefined;
		onOpen?: ((node: AlbumTreeNode) => void) | undefined;
		showAccordion?: boolean;
		expandAllByDefault?: boolean;
		clientSortBy?: 'manual' | 'name' | 'date';
	} = $props();

	let expandedNodes = $state(new Set<string>());
	let localAlbums = $state(albums);
	let albumsInitialized = $state(false);
	let flatItems = $state<AlbumTreeNode[]>([]);
	let flatItemsForDnd = $state<Array<AlbumTreeNode & { id: string }>>([]);
	let isDragging = $state(false);

	// Transform items to have 'id' property for svelte-dnd-action
	function transformForDnd(items: AlbumTreeNode[]): Array<AlbumTreeNode & { id: string }> {
		return items.map(item => ({
			...item,
			id: item._id
		}));
	}

	// Transform items back from dnd format
	function transformFromDnd(items: Array<AlbumTreeNode & { id: string }>): AlbumTreeNode[] {
		return items.map(item => {
			const { id, ...rest } = item;
			return rest as AlbumTreeNode;
		});
	}

	// Initialize expanded nodes if expandAllByDefault is true
	function initializeExpandedNodes() {
		if (expandAllByDefault && albums.length > 0) {
			const allNodeIds = new Set<string>();
			const collectIds = (nodes: AlbumTreeNode[]) => {
				nodes.forEach(node => {
					if (node.children.length > 0) {
						allNodeIds.add(node._id);
						collectIds(node.children);
					}
				});
			};
			const initialTree = buildTree(albums, clientSortBy);
			collectIds(initialTree);
			expandedNodes = allNodeIds;
		}
	}

	$effect(() => {
		if (albums.length > 0 && !albumsInitialized && expandAllByDefault) {
			initializeExpandedNodes();
			albumsInitialized = true;
		}
	});

	$effect(() => {
		if (albums.length === 0) {
			albumsInitialized = false;
		}
	});

	// Flatten tree for drag and drop
	function flatten(nodes: AlbumTreeNode[], expanded: Set<string>): AlbumTreeNode[] {
		const out: AlbumTreeNode[] = [];
		const walk = (arr: AlbumTreeNode[]) => {
			for (const n of arr) {
				out.push(n);
				if (n.children.length && (n.level < 1 || expanded.has(n._id))) {
					walk(n.children);
				}
			}
		};
		walk(nodes);
		return out;
	}

	function buildTree(albums: Album[], sortBy: 'manual' | 'name' | 'date'): AlbumTreeNode[] {
		const byId = new Map<string, AlbumTreeNode>();
		albums.forEach((a) => byId.set(a._id, { ...a, children: [] }));
		const roots: AlbumTreeNode[] = [];
		byId.forEach((node) => {
			const parentId = node.parentAlbumId ?? null;
			if (parentId && byId.has(parentId)) {
				byId.get(parentId)!.children.push(node);
			} else {
				roots.push(node);
			}
		});
		const sortRecursive = (nodes: AlbumTreeNode[]) => {
			nodes.sort((a, b) => {
				if (sortBy === 'name') {
					return getAlbumName(a).localeCompare(getAlbumName(b), undefined, { sensitivity: 'base' });
				}
				if (sortBy === 'date') {
					const da = a.updatedAt ? new Date(a.updatedAt).getTime() : 0;
					const db = b.updatedAt ? new Date(b.updatedAt).getTime() : 0;
					if (db !== da) return db - da;
					return getAlbumName(a).localeCompare(getAlbumName(b), undefined, { sensitivity: 'base' });
				}
				const orderA = a.order ?? 0;
				const orderB = b.order ?? 0;
				if (orderA !== orderB) {
					return orderA - orderB;
				}
				const nameA = typeof a.name === 'string' ? a.name : a.name?.en || '';
				const nameB = typeof b.name === 'string' ? b.name : b.name?.en || '';
				return nameA.localeCompare(nameB);
			});
			nodes.forEach((n) => sortRecursive(n.children));
		};
		sortRecursive(roots);
		return roots;
	}

	// Album name function is now imported from shared utility

	function toggleNode(nodeId: string) {
		// Create a new Set to trigger reactivity
		const newExpandedNodes = new Set(expandedNodes);
		if (newExpandedNodes.has(nodeId)) {
			newExpandedNodes.delete(nodeId);
		} else {
			newExpandedNodes.add(nodeId);
		}
		expandedNodes = newExpandedNodes;
	}

	function handleNodeClick(node: AlbumTreeNode) {
		if (onOpen) {
			onOpen(node);
		} else {
			goto(`/admin/albums/${node._id}`);
		}
	}

	// Handle drag consider (during drag, for visual feedback)
	function handleDndConsider(event: CustomEvent) {
		const { detail } = event;
		const { items } = detail;
		// Update flatItems with the reordered items from dndzone for visual feedback
		isDragging = true;
		flatItemsForDnd = items;
		flatItems = transformFromDnd(items);
	}

	// Handle drag end (when drag is complete)
	async function handleDndEnd(event: CustomEvent) {
		// Do NOT set isDragging = false here — it triggers reactive reset of flatItems before we use detail.items.
		const { detail } = event;
		const { items, info } = detail;

		// Transform items back from dnd format (this is the NEW order after drop)
		const transformedItems = transformFromDnd(items);

		if (!info) {
			isDragging = false;
			flatItems = flatten(tree, expandedNodes);
			flatItemsForDnd = transformForDnd(flatItems);
			return;
		}

		// Original flat list BEFORE drag (from current tree)
		const originalFlat = flatten(tree, expandedNodes);
		const originalIds = originalFlat.map(n => n._id);
		const newIds = transformedItems.map(n => n._id);

		// Prefer info.id (dragged item) to compute indices — library often omits initialIndex/finalIndex for droppedIntoZone
		const draggedId = typeof info.id === 'string' ? info.id : undefined;
		let fromIdx: number;
		let toIdx: number;

		if (draggedId !== undefined && originalIds.includes(draggedId)) {
			fromIdx = originalIds.indexOf(draggedId);
			toIdx = newIds.indexOf(draggedId);
		} else {
			// Fallback: indices from library or first difference
			const fromIndex = info.initialIndex ?? info.fromIndex ?? info.source?.index;
			const toIndex = info.finalIndex ?? info.toIndex ?? info.target?.index;
			if (fromIndex !== undefined && toIndex !== undefined) {
				fromIdx = fromIndex;
				toIdx = toIndex;
			} else {
				// Find first position where order differs
				fromIdx = -1;
				toIdx = -1;
				for (let i = 0; i < originalIds.length; i++) {
					if (originalIds[i] !== newIds[i]) {
						const movedId = originalIds[i];
						fromIdx = i;
						toIdx = newIds.indexOf(movedId);
						break;
					}
				}
			}
		}

		if (fromIdx === -1 || toIdx === -1 || fromIdx === toIdx) {
			isDragging = false;
			flatItems = flatten(tree, expandedNodes);
			flatItemsForDnd = transformForDnd(flatItems);
			return;
		}

		const activeNode = originalFlat[fromIdx];
		const overNode = transformedItems[toIdx];

		if (!activeNode || !overNode) {
			logger.warn('[AlbumTree] Missing nodes - active:', !!activeNode, 'over:', !!overNode);
			isDragging = false;
			flatItems = flatten(tree, expandedNodes);
			flatItemsForDnd = transformForDnd(flatItems);
			return;
		}

		// Prevent moving an album into its own descendant
		const isDescendant = (parentId: string, childId: string): boolean => {
			const child = originalFlat.find((n: AlbumTreeNode) => n._id === childId);
			if (!child) return false;
			if (child.parentAlbumId === parentId) return true;
			if (!child.parentAlbumId) return false;
			return isDescendant(parentId, child.parentAlbumId);
		};

		if (isDescendant(activeNode._id, overNode._id)) {
			logger.warn('Cannot move album into its own descendant');
			flatItems = flatten(tree, expandedNodes);
			flatItemsForDnd = transformForDnd(flatItems);
			return;
		}

		const updates: Array<{ id: string; parentAlbumId: string | null; order: number }> = [];

		// Same parent: reorder within siblings
		if ((activeNode.parentAlbumId ?? null) === (overNode.parentAlbumId ?? null)) {
			// Get ALL siblings from localAlbums (not just visible ones)
			const allSiblings = localAlbums
				.filter((a) => (a.parentAlbumId ?? null) === (activeNode.parentAlbumId ?? null))
				.map((a) => a._id);

			// Get siblings in the NEW order (from transformedItems - already reordered by drag)
			// This gives us the order of visible siblings after drag
			const reorderedVisibleSiblings = transformedItems
				.filter((item) => (item.parentAlbumId ?? null) === (activeNode.parentAlbumId ?? null))
				.map((item) => item._id);

			// Create a map of new positions for visible siblings
			const newPositionMap = new Map<string, number>();
			reorderedVisibleSiblings.forEach((id, idx) => {
				newPositionMap.set(id, idx);
			});

			// For siblings not in the visible list (shouldn't happen for same-parent, but handle it)
			// Keep their relative order but place them after visible ones
			const visibleSet = new Set(reorderedVisibleSiblings);
			const hiddenSiblings = allSiblings.filter((id) => !visibleSet.has(id));

			// Build final ordered list: visible siblings in new order, then hidden siblings
			const finalOrder = [...reorderedVisibleSiblings, ...hiddenSiblings];

			// Update order for ALL siblings based on their new positions
			finalOrder.forEach((id, idx) => {
				if (!id) {
					logger.warn('[AlbumTree] Skipping update with invalid id:', id);
					return;
				}
				const idStr = String(id);
				if (idStr.length !== 24 || !/^[0-9a-fA-F]{24}$/.test(idStr)) {
					logger.warn('[AlbumTree] Skipping update with invalid ID format:', idStr);
					return;
				}
				updates.push({
					id: idStr,
					parentAlbumId: activeNode.parentAlbumId != null ? String(activeNode.parentAlbumId) : null,
					order: idx
				});
			});
		} else {
			// Different parent: move to new parent and reorder
			const newParentId = overNode.parentAlbumId ?? null;

			// Get all siblings in the new parent (excluding the dragged item) from localAlbums
			const allNewSiblings = localAlbums
				.filter((a) => (a.parentAlbumId ?? null) === newParentId && a._id !== activeNode._id)
				.map((a) => a._id);

			// Get visible siblings in NEW order from transformedItems
			const reorderedVisibleNewSiblings = transformedItems
				.filter((item) => (item.parentAlbumId ?? null) === newParentId && item._id !== activeNode._id)
				.map((item) => item._id);

			// Find the position where we're inserting the dragged item
			const overIndex = reorderedVisibleNewSiblings.indexOf(overNode._id);
			const insertIndex = overIndex >= 0 ? overIndex : reorderedVisibleNewSiblings.length;

			// Build final order: visible siblings up to insert point, then dragged item, then rest
			const finalNewOrder = [
				...reorderedVisibleNewSiblings.slice(0, insertIndex),
				activeNode._id,
				...reorderedVisibleNewSiblings.slice(insertIndex)
			];

			// Add any hidden siblings (not in visible list) at the end
			const visibleNewSet = new Set(reorderedVisibleNewSiblings);
			const hiddenNewSiblings = allNewSiblings.filter((id) => !visibleNewSet.has(id));
			finalNewOrder.push(...hiddenNewSiblings);

			// Update order for ALL siblings in the new parent
			finalNewOrder.forEach((id, idx) => {
				if (!id) {
					logger.warn('[AlbumTree] Skipping update with invalid id:', id);
					return;
				}
				const idStr = String(id);
				if (idStr.length !== 24 || !/^[0-9a-fA-F]{24}$/.test(idStr)) {
					logger.warn('[AlbumTree] Skipping update with invalid ID format:', idStr);
					return;
				}
				updates.push({
					id: idStr,
					parentAlbumId: newParentId != null ? String(newParentId) : null,
					order: idx
				});
			});

			// Reorder ALL siblings in the old parent (excluding the moved item)
			const allOldSiblings = localAlbums
				.filter(
					(a) =>
						(a.parentAlbumId ?? null) === (activeNode.parentAlbumId ?? null) &&
						a._id !== activeNode._id
				)
				.map((a) => a._id);

			// Update order for ALL siblings in the old parent (sequential: 0, 1, 2, ...)
			allOldSiblings.forEach((id, idx) => {
				if (!id) {
					logger.warn('[AlbumTree] Skipping update with invalid id:', id);
					return;
				}
				const idStr = String(id);
				if (idStr.length !== 24 || !/^[0-9a-fA-F]{24}$/.test(idStr)) {
					logger.warn('[AlbumTree] Skipping update with invalid ID format:', idStr);
					return;
				}
				updates.push({
					id: idStr,
					parentAlbumId: activeNode.parentAlbumId != null ? String(activeNode.parentAlbumId) : null,
					order: idx
				});
			});
		}

		if (updates.length === 0) {
			isDragging = false;
			flatItems = flatten(tree, expandedNodes);
			flatItemsForDnd = transformForDnd(flatItems);
			return;
		}

		// Optimistically update local state
		localAlbums = localAlbums.map((a) => {
			const u = updates.find((x) => x.id === a._id);
			if (u) {
				return {
					...a,
					parentAlbumId: u.parentAlbumId ?? null,
					order: u.order
				};
			}
			return a;
		});

		// Update flatItems from the new tree structure
		const newTree = buildTree(localAlbums, clientSortBy);
		flatItems = flatten(newTree, expandedNodes);
		flatItemsForDnd = transformForDnd(flatItems);

		// Save to server
		if (onReorder) {
			try {
				await onReorder(updates);
			} catch (error) {
				logger.error('Failed to reorder albums:', error);
				// Revert on error
				localAlbums = albums;
				flatItems = flatten(tree, expandedNodes);
				flatItemsForDnd = transformForDnd(flatItems);
				isDragging = false;
				throw error;
			}
		} else {
			logger.warn('[AlbumTree] No onReorder callback provided');
		}
		isDragging = false;
	}

	$effect(() => {
		localAlbums = albums;
	});

	const tree = $derived(buildTree(localAlbums, clientSortBy));
	const expandedNodesArray = $derived(Array.from(expandedNodes).sort());

	$effect(() => {
		const _ = expandedNodesArray;
		if (!isDragging) {
			flatItems = flatten(tree, expandedNodes);
			flatItemsForDnd = transformForDnd(flatItems);
		}
	});

</script>

<div class="album-tree">
	<div
		use:dndzone={{
			items: flatItemsForDnd,
			type: 'album-tree',
			dragDisabled: !onReorder,
			dropFromOthersDisabled: true,
			dropTargetStyle: {
				outline: '2px dashed rgba(59, 130, 246, 0.5)',
				backgroundColor: 'rgba(59, 130, 246, 0.1)'
			}
		}}
		onconsider={handleDndConsider}
		onfinalize={handleDndEnd}
	>
		{#each flatItemsForDnd as node (node.id)}
			<div class="album-tree-node" style="padding-left: {node.level * 1.5}rem;" data-id={node._id}>
				<div class="flex items-center gap-2 py-2 px-3 hover:bg-gray-50 rounded-md group">
					{#if showAccordion && node.children && node.children.length > 0}
						<button
							type="button"
							onclick={(e) => {
								e.stopPropagation();
								toggleNode(node._id);
							}}
							class="shrink-0 w-6 h-6 flex items-center justify-center text-gray-400 hover:text-gray-600"
							aria-label={expandedNodes.has(node._id) ? 'Collapse' : 'Expand'}
						>
							<svg
								class="w-4 h-4 transition-transform {expandedNodes.has(node._id) ? 'rotate-90' : ''}"
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

					<div class="flex-1 flex items-center gap-3 min-w-0">
						<!-- Drag handle - visible icon -->
						<div 
							class="drag-handle shrink-0 cursor-grab active:cursor-grabbing text-gray-600 hover:text-gray-800 p-1.5 rounded hover:bg-gray-200 transition-colors flex items-center justify-center border border-gray-300" 
							title={$t('admin.albumsListDragToReorder')}
							style="user-select: none; min-width: 28px; height: 28px; touch-action: none;"
						>
							<span class="text-base font-bold text-gray-600 leading-none" style="line-height: 1;">⋮⋮</span>
						</div>
						<div
							onclick={(e) => {
								e.stopPropagation();
								handleNodeClick(node);
							}}
							onkeydown={(e) => {
								e.stopPropagation();
								if (e.key === 'Enter' || e.key === ' ') {
									e.preventDefault();
									handleNodeClick(node);
								}
							}}
							class="flex-1 text-left min-w-0 cursor-pointer"
							role="button"
							tabindex="0"
						>
							<div class="flex-1 min-w-0">
								<div class="flex items-center gap-2 flex-wrap">
									<span class="font-medium text-gray-900 truncate">{getAlbumName(node)}</span>
									{#if node.isFeatured}
										<span
											class="inline-flex items-center px-2 py-0.5 rounded text-xs font-medium bg-yellow-100 text-yellow-800"
											title={$t('admin.featured')}
										>
											⭐ {$t('admin.featured')}
										</span>
									{/if}
									{#if (node.allowedGroups ?? []).length > 0}
										<span
											class="inline-flex items-center px-2 py-0.5 rounded text-xs font-medium bg-blue-50 text-blue-800"
											title="Restricted to groups: {(node.allowedGroups ?? []).join(', ')}"
										>
											Group: {(node.allowedGroups ?? []).join(', ')}
										</span>
									{/if}
									{#if (node.allowedUsers ?? []).length > 0}
										<span
											class="inline-flex items-center px-2 py-0.5 rounded text-xs font-medium bg-indigo-50 text-indigo-800"
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
							<div class="shrink-0 opacity-0 group-hover:opacity-100 transition-opacity" role="group" aria-label="Album actions">
								{@html renderActions(node)}
							</div>
						{/if}
					</div>
				</div>

			</div>
		{/each}
	</div>
</div>

<style>
	.album-tree {
		display: flex;
		flex-direction: column;
		gap: 0.25rem;
	}

	.album-tree-node {
		width: 100%;
	}
</style>
