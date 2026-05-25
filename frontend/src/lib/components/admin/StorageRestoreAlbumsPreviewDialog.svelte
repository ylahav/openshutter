<script lang="ts">
	import StorageRestoreAlbumTreeNode from './StorageRestoreAlbumTreeNode.svelte';

	export type StorageRestoreAlbumItem = {
		id: string;
		storagePath: string;
		folderName: string;
		parentStoragePath: string;
		status: 'exists' | 'create';
		proposedAlias?: string;
	};

	export type StorageRestoreAlbumReport = {
		summary: { total: number; existing: number; toCreate: number };
		items: StorageRestoreAlbumItem[];
	};

	type TreeNode = {
		item: StorageRestoreAlbumItem;
		children: TreeNode[];
	};

	export let open = false;
	export let report: StorageRestoreAlbumReport | null = null;
	export let selectedIds: Set<string> = new Set();
	export let loading = false;
	export let onClose: () => void = () => {};
	export let onToggleSelect: (id: string) => void = () => {};
	export let onSelectAll: () => void = () => {};
	export let onClearSelection: () => void = () => {};
	export let onConfirm: () => void = () => {};

	let expandedIds = new Set<string>();

	function normalizePath(p: string): string {
		return (p ?? '').replace(/^\/+/, '').replace(/\/+$/, '');
	}

	function buildTree(items: StorageRestoreAlbumItem[]): TreeNode[] {
		const childrenByParent = new Map<string, StorageRestoreAlbumItem[]>();
		for (const item of items) {
			const parent = normalizePath(item.parentStoragePath);
			if (!childrenByParent.has(parent)) childrenByParent.set(parent, []);
			childrenByParent.get(parent)!.push(item);
		}
		const build = (parentPath: string): TreeNode[] => {
			const kids = childrenByParent.get(parentPath) ?? [];
			kids.sort((a, b) => a.folderName.localeCompare(b.folderName));
			return kids.map((item) => ({
				item,
				children: build(normalizePath(item.storagePath)),
			}));
		};
		return build('');
	}

	$: tree = report?.items?.length ? buildTree(report.items) : [];

	$: if (open && report?.items?.length) {
		const next = new Set<string>();
		for (const item of report.items) {
			const parent = normalizePath(item.parentStoragePath);
			const hasChildren = report.items.some(
				(c) => normalizePath(c.parentStoragePath) === normalizePath(item.storagePath),
			);
			if (hasChildren) next.add(item.id);
		}
		expandedIds = next;
	}

	function toggleExpanded(id: string) {
		const next = new Set(expandedIds);
		if (next.has(id)) next.delete(id);
		else next.add(id);
		expandedIds = next;
	}

	function selectedCount(): number {
		return selectedIds.size;
	}

	function handleBackdropClick(e: MouseEvent) {
		if (e.target === e.currentTarget && !loading) onClose();
	}

	function handleKeydown(e: KeyboardEvent) {
		if (e.key === 'Escape' && !loading) onClose();
	}
</script>

<svelte:window on:keydown={handleKeydown} />

{#if open && report}
	<!-- svelte-ignore a11y_click_events_have_key_events a11y_no_noninteractive_element_interactions -->
	<div
		class="fixed inset-0 z-50 flex items-center justify-center bg-black/50 p-4"
		role="dialog"
		aria-modal="true"
		aria-labelledby="restore-albums-dialog-title"
		on:click={handleBackdropClick}
	>
		<div
			class="card preset-outlined-surface-200-800 bg-surface-50-950 flex max-h-[90vh] w-full max-w-2xl flex-col shadow-xl"
			on:click|stopPropagation
		>
			<div class="border-b border-surface-200-800 px-6 py-4">
				<h2 id="restore-albums-dialog-title" class="text-lg font-semibold text-(--color-surface-950-50)">
					Album scan preview
				</h2>
				<p class="mt-1 text-sm text-(--color-surface-600-400)">
					<strong>{report.summary.total}</strong> folders ·
					<span class="text-success-600">{report.summary.existing} in DB</span> ·
					<span class="text-(--color-primary-600)">{report.summary.toCreate} new</span>
				</p>
			</div>

			<div class="min-h-0 flex-1 overflow-y-auto px-4 py-3">
				{#if tree.length === 0}
					<p class="py-8 text-center text-sm text-(--color-surface-600-400)">No album folders found.</p>
				{:else}
					<ul class="space-y-0.5" role="tree">
						{#each tree as node (node.item.id)}
							<StorageRestoreAlbumTreeNode
								{node}
								depth={0}
								{expandedIds}
								{selectedIds}
								{onToggleSelect}
								onToggleExpand={toggleExpanded}
							/>
						{/each}
					</ul>
				{/if}
			</div>

			<div class="flex flex-wrap items-center justify-between gap-3 border-t border-surface-200-800 px-6 py-4">
				<div class="flex gap-2 text-sm">
					<button
						type="button"
						class="text-(--color-primary-600) hover:underline disabled:opacity-50"
						disabled={loading}
						on:click={onSelectAll}
					>
						Select all new
					</button>
					<button
						type="button"
						class="text-(--color-surface-600-400) hover:underline disabled:opacity-50"
						disabled={loading}
						on:click={onClearSelection}
					>
						Clear
					</button>
				</div>
				<div class="flex gap-2">
					<button
						type="button"
						class="btn preset-tonal"
						disabled={loading}
						on:click={onClose}
					>
						Cancel
					</button>
					<button
						type="button"
						class="btn preset-filled-primary-500"
						disabled={loading || selectedCount() === 0}
						on:click={onConfirm}
					>
						{loading ? 'Creating…' : `Create selected (${selectedCount()})`}
					</button>
				</div>
			</div>
		</div>
	</div>
{/if}
