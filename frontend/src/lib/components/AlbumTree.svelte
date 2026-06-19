<script lang="ts">
	import { goto } from '$app/navigation';
	import { dragHandleZone } from 'svelte-dnd-action';
	import AdminAlbumTreeRow from '$lib/components/AdminAlbumTreeRow.svelte';
	import { getAlbumName } from '$lib/utils/albumUtils';
	import { logger } from '$lib/utils/logger';
	import { untrack } from 'svelte';

	function nodeIdStr(id: string | unknown): string {
		return String(id);
	}

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
		defaultExpandedDepth = 1,
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
		/** Tree depth to expand on load (1 = show roots and their direct children only). */
		defaultExpandedDepth?: number;
		clientSortBy?: 'manual' | 'name' | 'date';
	} = $props();

	type FlatAlbumTreeNode = AlbumTreeNode & { displayDepth: number; hasChildNodes: boolean };

	let expandedNodesOverride = $state<Set<string> | null>(null);
	let localAlbums = $state(untrack(() => albums));
	let flatItemsForDnd = $state<Array<FlatAlbumTreeNode & { id: string }>>([]);
	let isDragging = $state(false);

	// Transform items to have 'id' property for svelte-dnd-action
	function transformForDnd(items: FlatAlbumTreeNode[]): Array<FlatAlbumTreeNode & { id: string }> {
		return items.map(item => ({
			...item,
			id: item._id
		}));
	}

	// Transform items back from dnd format
	function transformFromDnd(items: Array<FlatAlbumTreeNode & { id: string }>): FlatAlbumTreeNode[] {
		return items.map(item => {
			const { id, ...rest } = item;
			return rest as FlatAlbumTreeNode;
		});
	}

	// Flatten tree for drag and drop (uses tree depth + expanded set, not DB level field)
	function flatten(nodes: AlbumTreeNode[], expanded: Set<string>): FlatAlbumTreeNode[] {
		const out: FlatAlbumTreeNode[] = [];
		const walk = (arr: AlbumTreeNode[], depth: number) => {
			for (const n of arr) {
				out.push({ ...n, displayDepth: depth, hasChildNodes: n.children.length > 0 });
				if (n.children.length && expanded.has(nodeIdStr(n._id))) {
					walk(n.children, depth + 1);
				}
			}
		};
		walk(nodes, 0);
		return out;
	}

	function buildTree(albums: Album[], sortBy: 'manual' | 'name' | 'date'): AlbumTreeNode[] {
		const byId = new Map<string, AlbumTreeNode>();
		albums.forEach((a) => byId.set(String(a._id), { ...a, children: [] }));
		const roots: AlbumTreeNode[] = [];
		byId.forEach((node) => {
			const parentId = node.parentAlbumId != null ? String(node.parentAlbumId) : null;
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
		const id = nodeIdStr(nodeId);
		const current = expandedNodesOverride ?? defaultExpandedNodes;
		const newExpandedNodes = new Set(current);
		if (newExpandedNodes.has(id)) {
			newExpandedNodes.delete(id);
		} else {
			newExpandedNodes.add(id);
		}
		expandedNodesOverride = newExpandedNodes;
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
		isDragging = true;
		flatItemsForDnd = items;
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
			flatItemsForDnd = transformForDnd(displayFlatItems);
			return;
		}

		// Original flat list BEFORE drag (from current tree)
		const originalFlat = flatten(tree, effectiveExpandedNodes);
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
			flatItemsForDnd = transformForDnd(displayFlatItems);
			return;
		}

		const activeNode = originalFlat[fromIdx];
		const overNode = transformedItems[toIdx];

		if (!activeNode || !overNode) {
			logger.warn('[AlbumTree] Missing nodes - active:', !!activeNode, 'over:', !!overNode);
			isDragging = false;
			flatItemsForDnd = transformForDnd(displayFlatItems);
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
			flatItemsForDnd = transformForDnd(displayFlatItems);
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
			flatItemsForDnd = transformForDnd(displayFlatItems);
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

		// Update flat list from the new tree structure
		const newTree = buildTree(localAlbums, clientSortBy);
		flatItemsForDnd = transformForDnd(flatten(newTree, effectiveExpandedNodes));

		// Save to server
		if (onReorder) {
			try {
				await onReorder(updates);
			} catch (error) {
				logger.error('Failed to reorder albums:', error);
				// Revert on error
				localAlbums = albums;
				flatItemsForDnd = transformForDnd(displayFlatItems);
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

	const albumsSignature = $derived(albums.map((a) => nodeIdStr(a._id)).sort().join('|'));
	let lastAlbumsSignature = $state('');

	$effect(() => {
		if (lastAlbumsSignature && lastAlbumsSignature !== albumsSignature) {
			expandedNodesOverride = null;
		}
		lastAlbumsSignature = albumsSignature;
	});

	const tree = $derived(buildTree(localAlbums, clientSortBy));

	const defaultExpandedNodes = $derived.by(() => {
		if (tree.length === 0) return new Set<string>();
		if (expandAllByDefault) {
			const allNodeIds = new Set<string>();
			const collectIds = (nodes: AlbumTreeNode[]) => {
				for (const node of nodes) {
					if (node.children.length > 0) {
						allNodeIds.add(nodeIdStr(node._id));
						collectIds(node.children);
					}
				}
			};
			collectIds(tree);
			return allNodeIds;
		}
		if (defaultExpandedDepth <= 0) return new Set<string>();
		const ids = new Set<string>();
		const walk = (nodes: AlbumTreeNode[], depth: number) => {
			for (const node of nodes) {
				if (node.children.length > 0 && depth < defaultExpandedDepth) {
					ids.add(nodeIdStr(node._id));
					walk(node.children, depth + 1);
				}
			}
		};
		walk(tree, 0);
		return ids;
	});

	const effectiveExpandedNodes = $derived(expandedNodesOverride ?? defaultExpandedNodes);
	const displayFlatItems = $derived(flatten(tree, effectiveExpandedNodes));
	const displayFlatItemsForDnd = $derived(
		isDragging ? flatItemsForDnd : transformForDnd(displayFlatItems)
	);

	const dndZoneConfig = $derived({
		items: displayFlatItemsForDnd,
		type: 'album-tree',
		dragDisabled: !onReorder,
		dropFromOthersDisabled: true,
		flipDurationMs: 0,
		morphDisabled: true,
		dropTargetStyle: {
			outline: '2px dashed rgba(59, 130, 246, 0.5)',
			backgroundColor: 'rgba(59, 130, 246, 0.1)',
		},
	});

</script>

<div class="album-tree">
	{#if onReorder}
		<div
			use:dragHandleZone={dndZoneConfig}
			onconsider={handleDndConsider}
			onfinalize={handleDndEnd}
		>
			{#each displayFlatItemsForDnd as node (node.id)}
				<AdminAlbumTreeRow
					node={{ ...node, children: [] }}
					depth={node.displayDepth}
					expandedNodes={effectiveExpandedNodes}
					isExpanded={effectiveExpandedNodes.has(nodeIdStr(node._id))}
					{showAccordion}
					reorderEnabled={true}
					flatMode={true}
					onToggle={toggleNode}
					onOpen={handleNodeClick}
					{renderActions}
				/>
			{/each}
		</div>
	{:else}
		{#each tree as rootNode (nodeIdStr(rootNode._id))}
			<AdminAlbumTreeRow
				node={rootNode}
				depth={0}
				expandedNodes={effectiveExpandedNodes}
				isExpanded={effectiveExpandedNodes.has(nodeIdStr(rootNode._id))}
				{showAccordion}
				reorderEnabled={false}
				onToggle={toggleNode}
				onOpen={handleNodeClick}
				{renderActions}
			/>
		{/each}
	{/if}
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
