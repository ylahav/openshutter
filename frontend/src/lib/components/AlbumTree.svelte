<script lang="ts">
	import { currentLanguage } from '$stores/language';
	import { MultiLangUtils } from '$utils/multiLang';
	import { goto } from '$app/navigation';

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

	let expandedNodes: Set<string> = new Set();

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
		expandedNodes = new Set(expandedNodes);
		if (expandedNodes.has(nodeId)) {
			expandedNodes.delete(nodeId);
		} else {
			expandedNodes.add(nodeId);
		}
	}

	function handleNodeClick(node: AlbumTreeNode) {
		if (onOpen) {
			onOpen(node);
		} else {
			goto(`/admin/albums/${node._id}`);
		}
	}

	$: tree = buildTree(albums);
</script>

<div class="album-tree">
	{#each tree as node (node._id)}
		<div class="album-tree-node">
			<div class="flex items-center gap-2 py-2 px-3 hover:bg-gray-50 rounded-md group">
				{#if showAccordion && node.children.length > 0}
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

			{#if showAccordion && expandedNodes.has(node._id) && node.children.length > 0}
				<div class="ml-4 border-l border-gray-200 pl-2">
					{#each node.children as child (child._id)}
						<div class="album-tree-node">
							<div class="flex items-center gap-2 py-2 px-3 hover:bg-gray-50 rounded-md group">
								{#if child.children.length > 0}
									<button
										type="button"
										on:click|stopPropagation={() => toggleNode(child._id)}
										class="flex-shrink-0 w-6 h-6 flex items-center justify-center text-gray-400 hover:text-gray-600"
									>
										<svg
											class="w-4 h-4 transition-transform {expandedNodes.has(child._id) ? 'rotate-90' : ''}"
											fill="none"
											viewBox="0 0 24 24"
											stroke="currentColor"
										>
											<path
												stroke-linecap="round"
												stroke-linejoin="round"
												stroke-width="2"
												d="M9 5l7 7-7 7"
											/>
										</svg>
									</button>
								{:else}
									<div class="w-6"></div>
								{/if}

								<button
									type="button"
									on:click={() => handleNodeClick(child)}
									class="flex-1 text-left flex items-center gap-3 min-w-0"
								>
									<div class="flex-1 min-w-0">
										<div class="flex items-center gap-2">
											<span class="font-medium text-gray-900 truncate">{getAlbumName(child)}</span>
											{#if child.isFeatured}
												<span
													class="inline-flex items-center px-2 py-0.5 rounded text-xs font-medium bg-yellow-100 text-yellow-800"
												>
													⭐
												</span>
											{/if}
											{#if !child.isPublic}
												<span
													class="inline-flex items-center px-2 py-0.5 rounded text-xs font-medium bg-gray-100 text-gray-800"
												>
													Private
												</span>
											{/if}
										</div>
										<div class="text-sm text-gray-500">
											{child.photoCount || 0} photos • Level {child.level}
										</div>
									</div>
								</button>

								{#if renderActions}
									<div class="flex-shrink-0 opacity-0 group-hover:opacity-100 transition-opacity">
										{@html renderActions(child)}
									</div>
								{/if}
							</div>

							{#if expandedNodes.has(child._id) && child.children.length > 0}
								<div class="ml-4 border-l border-gray-200 pl-2">
									{#each child.children as grandchild (grandchild._id)}
										<div class="flex items-center gap-2 py-2 px-3 hover:bg-gray-50 rounded-md group">
											<div class="w-6"></div>
											<button
												type="button"
												on:click={() => handleNodeClick(grandchild)}
												class="flex-1 text-left flex items-center gap-3 min-w-0"
											>
												<div class="flex-1 min-w-0">
													<div class="flex items-center gap-2">
														<span class="font-medium text-gray-900 truncate"
															>{getAlbumName(grandchild)}</span
														>
														{#if grandchild.isFeatured}
															<span
																class="inline-flex items-center px-2 py-0.5 rounded text-xs font-medium bg-yellow-100 text-yellow-800"
															>
																⭐
															</span>
														{/if}
														{#if !grandchild.isPublic}
															<span
																class="inline-flex items-center px-2 py-0.5 rounded text-xs font-medium bg-gray-100 text-gray-800"
															>
																Private
															</span>
														{/if}
													</div>
													<div class="text-sm text-gray-500">
														{grandchild.photoCount || 0} photos • Level {grandchild.level}
													</div>
												</div>
											</button>

											{#if renderActions}
												<div class="flex-shrink-0 opacity-0 group-hover:opacity-100 transition-opacity">
													{@html renderActions(grandchild)}
												</div>
											{/if}
										</div>
									{/each}
								</div>
							{/if}
						</div>
					{/each}
				</div>
			{/if}
		</div>
	{/each}
</div>

<style>
	.album-tree {
		@apply space-y-1;
	}

	.album-tree-node {
		@apply w-full;
	}
</style>


