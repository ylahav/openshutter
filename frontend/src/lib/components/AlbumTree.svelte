<script lang="ts">
	import { onMount } from 'svelte';
	import { currentLanguage } from '$stores/language';
	import { MultiLangUtils } from '$utils/multiLang';
	import { goto } from '$app/navigation';
	import { dndzone } from 'svelte-dnd-action';

	interface Album {
		_id: string;
		name: string | { en?: string; he?: string };
		alias: string;
		parentAlbumId?: string | null;
		level: number;
		order: number;
		photoCount?: number;
		isPublic?: boolean;
		isFeatured?: boolean;
		childAlbumCount?: number;
	}

	interface AlbumTreeNode extends Album {
		children: AlbumTreeNode[];
	}

	export let albums: Album[] = [];
	export let onReorder:
		| ((updates: Array<{ id: string; parentAlbumId: string | null; order: number }>) => Promise<void>)
		| undefined = undefined;
	export let renderActions: ((node: AlbumTreeNode) => any) | undefined = undefined;
	export let onOpen: ((node: AlbumTreeNode) => void) | undefined = undefined;
	export let showAccordion = true;
	export let expandAllByDefault = false; // Option to expand all nodes by default

	let expandedNodes: Set<string> = new Set();
	let localAlbums = albums;
	let albumsInitialized = false;
	let flatItems: AlbumTreeNode[] = [];

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
			const initialTree = buildTree(albums);
			collectIds(initialTree);
			expandedNodes = allNodeIds;
		}
	}

	// Initialize expanded nodes when albums first load
	$: if (albums.length > 0 && !albumsInitialized && expandAllByDefault) {
		initializeExpandedNodes();
		albumsInitialized = true;
	}

	// Reset flag if albums are cleared
	$: if (albums.length === 0) {
		albumsInitialized = false;
	}

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

	function buildTree(albums: Album[]): AlbumTreeNode[] {
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

	function getAlbumName(album: Album): string {
		if (typeof album.name === 'string') return album.name;
		return MultiLangUtils.getTextValue(album.name, $currentLanguage) || '(No name)';
	}

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

	// Handle drag end
	async function handleDndEnd(event: CustomEvent) {
		const { detail } = event;
		const { items, info } = detail;

		if (!info) return;

		const fromIndex = info.initialIndex;
		const toIndex = info.finalIndex;

		if (fromIndex === toIndex) return;

		const flat = flatten(tree, expandedNodes);
		const activeNode = flat[fromIndex];
		const overNode = flat[toIndex];

		if (!activeNode || !overNode) return;

		// Prevent moving an album into its own descendant
		const isDescendant = (parentId: string, childId: string): boolean => {
			const child = flat.find((n) => n._id === childId);
			if (!child) return false;
			if (child.parentAlbumId === parentId) return true;
			if (!child.parentAlbumId) return false;
			return isDescendant(parentId, child.parentAlbumId);
		};

		if (isDescendant(activeNode._id, overNode._id)) {
			console.warn('Cannot move album into its own descendant');
			return;
		}

		const updates: Array<{ id: string; parentAlbumId: string | null; order: number }> = [];

		// Same parent: reorder within siblings
		if ((activeNode.parentAlbumId ?? null) === (overNode.parentAlbumId ?? null)) {
			const siblings = localAlbums
				.filter((a) => (a.parentAlbumId ?? null) === (activeNode.parentAlbumId ?? null))
				.sort((a, b) => (a.order - b.order) || a.name.toString().localeCompare(b.name.toString()));
			const ids = siblings.map((s) => s._id);
			const from = ids.indexOf(activeNode._id);
			const to = ids.indexOf(overNode._id);
			if (from === -1 || to === -1) return;
			// Simple array move
			const newIds = [...ids];
			const [moved] = newIds.splice(from, 1);
			newIds.splice(to, 0, moved);
			updates.push(
				...newIds.map((id, idx) => ({
					id,
					parentAlbumId: activeNode.parentAlbumId ?? null,
					order: idx
				}))
			);
		} else {
			// Different parent: move to new parent and reorder
			const newParentId = overNode.parentAlbumId ?? null;

			// Get all siblings in the new parent (excluding the dragged item)
			const newSiblings = localAlbums
				.filter((a) => (a.parentAlbumId ?? null) === newParentId && a._id !== activeNode._id)
				.sort((a, b) => (a.order - b.order) || a.name.toString().localeCompare(b.name.toString()));

			// Find the position where we're inserting
			const overIndex = newSiblings.findIndex((s) => s._id === overNode._id);
			const insertIndex = overIndex >= 0 ? overIndex : newSiblings.length;

			// Create new order: insert dragged item at the target position
			const newOrder = [...newSiblings];
			newOrder.splice(insertIndex, 0, activeNode as any);

			// Update all affected albums
			// 1. Update the moved album's parent and order
			updates.push({
				id: activeNode._id,
				parentAlbumId: newParentId,
				order: insertIndex
			});

			// 2. Update order of siblings after insertion point
			newOrder.forEach((album, idx) => {
				if (album._id !== activeNode._id) {
					updates.push({
						id: album._id,
						parentAlbumId: newParentId,
						order: idx
					});
				}
			});

			// 3. Reorder siblings in the old parent
			const oldSiblings = localAlbums
				.filter(
					(a) =>
						(a.parentAlbumId ?? null) === (activeNode.parentAlbumId ?? null) &&
						a._id !== activeNode._id
				)
				.sort((a, b) => (a.order - b.order) || a.name.toString().localeCompare(b.name.toString()));

			oldSiblings.forEach((album, idx) => {
				updates.push({
					id: album._id,
					parentAlbumId: activeNode.parentAlbumId ?? null,
					order: idx
				});
			});
		}

		if (updates.length === 0) return;

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

		// Save to server
		if (onReorder) {
			try {
				await onReorder(updates);
			} catch (error) {
				console.error('Failed to reorder albums:', error);
				// Revert on error
				localAlbums = albums;
				throw error;
			}
		}
	}

	// Sync localAlbums when albums prop changes
	$: {
		localAlbums = albums;
	}

	$: tree = buildTree(localAlbums);
	// Make flatItems reactive to both tree and expandedNodes changes
	// Convert Set to Array to ensure Svelte tracks changes properly
	// This ensures that when expandedNodes changes, this reactive statement re-runs
	$: expandedNodesArray = Array.from(expandedNodes).sort();
	// flatItems depends on both tree and expandedNodesArray to ensure reactivity
	// We reference expandedNodesArray to ensure Svelte tracks changes to expandedNodes
	$: {
		// Reference expandedNodesArray to ensure reactivity
		const _ = expandedNodesArray;
		flatItems = flatten(tree, expandedNodes);
	}
</script>

<div class="album-tree">
	<div
		use:dndzone={{
			items: flatItems,
			type: 'album-tree',
			dragDisabled: false,
			dropFromOthersDisabled: true,
			dragHandleSelector: '.drag-handle',
			dropTargetStyle: {
				outline: '2px dashed rgba(59, 130, 246, 0.5)',
				backgroundColor: 'rgba(59, 130, 246, 0.1)'
			},
			dragDisabledStyle: {
				opacity: '0.5',
				cursor: 'not-allowed'
			}
		}}
		on:consider={handleDndEnd}
		on:finalize={handleDndEnd}
	>
		{#each flatItems as node (node._id)}
			<div class="album-tree-node" style="padding-left: {node.level * 1.5}rem;" data-id={node._id}>
				<div class="flex items-center gap-2 py-2 px-3 hover:bg-gray-50 rounded-md group cursor-move">
					{#if showAccordion && node.children && node.children.length > 0}
						<button
							type="button"
							on:click|stopPropagation={() => toggleNode(node._id)}
							class="flex-shrink-0 w-6 h-6 flex items-center justify-center text-gray-400 hover:text-gray-600"
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
							class="drag-handle flex-shrink-0 cursor-move text-gray-600 hover:text-gray-800 p-1.5 rounded hover:bg-gray-200 transition-colors flex items-center justify-center border border-gray-300" 
							title="Drag to reorder"
							style="user-select: none; min-width: 28px; height: 28px; pointer-events: auto;"
						>
							<span class="text-base font-bold text-gray-600 leading-none" style="line-height: 1;">⋮⋮</span>
						</div>
						<button
							type="button"
							on:click={() => handleNodeClick(node)}
							class="flex-1 text-left flex items-center gap-3 min-w-0"
						>
							<div class="flex-1 min-w-0">
								<div class="flex items-center gap-2">
									<span class="font-medium text-gray-900 truncate">{getAlbumName(node)}</span>
									{#if node.isFeatured}
										<span
											class="inline-flex items-center px-2 py-0.5 rounded text-xs font-medium bg-yellow-100 text-yellow-800"
										>
											⭐ Featured
										</span>
									{/if}
									{#if !node.isPublic}
										<span
											class="inline-flex items-center px-2 py-0.5 rounded text-xs font-medium bg-gray-100 text-gray-800"
										>
											Private
										</span>
									{/if}
								</div>
								<div class="text-sm text-gray-500">
									{node.photoCount || 0} photos • Level {node.level}
								</div>
							</div>
						</button>

						{#if renderActions}
							<div class="flex-shrink-0 opacity-0 group-hover:opacity-100 transition-opacity">
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
