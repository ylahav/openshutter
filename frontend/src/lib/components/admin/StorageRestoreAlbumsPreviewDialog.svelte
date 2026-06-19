<script lang="ts">
	import { onDestroy, onMount } from 'svelte';
	import { portalToBody } from '$lib/actions/portalToBody';
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

	let {
		report,
		selectedIds = new Set<string>(),
		executing = false,
		dismiss,
		toggleSelect,
		selectAll,
		clearSelection,
		confirmCreate,
	}: {
		report: StorageRestoreAlbumReport;
		selectedIds?: Set<string>;
		executing?: boolean;
		dismiss?: () => void;
		toggleSelect?: (id: string) => void;
		selectAll?: () => void;
		clearSelection?: () => void;
		confirmCreate?: () => void;
	} = $props();

	let expandedIds = $state(new Set<string>());
	const selectedCount = $derived(selectedIds.size);

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

	const tree = $derived(report.items?.length ? buildTree(report.items) : []);

	$effect(() => {
		if (!report.items?.length) {
			expandedIds = new Set();
			return;
		}
		const next = new Set<string>();
		for (const item of report.items) {
			const hasChildren = report.items.some(
				(c) => normalizePath(c.parentStoragePath) === normalizePath(item.storagePath),
			);
			if (hasChildren) next.add(item.id);
		}
		expandedIds = next;
	});

	function toggleExpanded(id: string) {
		const next = new Set(expandedIds);
		if (next.has(id)) next.delete(id);
		else next.add(id);
		expandedIds = next;
	}

	function requestDismiss() {
		if (executing) return;
		dismiss?.();
	}

	function handleBackdropPointerDown(event: PointerEvent) {
		event.preventDefault();
		requestDismiss();
	}

	function handleEscape(event: KeyboardEvent) {
		if (event.key === 'Escape') requestDismiss();
	}

	onMount(() => {
		document.body.style.overflow = 'hidden';
		window.addEventListener('keydown', handleEscape);
	});

	onDestroy(() => {
		document.body.style.overflow = '';
		window.removeEventListener('keydown', handleEscape);
	});
</script>

<div use:portalToBody class="fixed inset-0 z-[10000] isolate">
	<div
		class="absolute inset-0 bg-black/50"
		role="presentation"
		onpointerdown={handleBackdropPointerDown}
	></div>

	<div class="absolute inset-0 flex items-center justify-center p-4 pointer-events-none" role="presentation">
		<div
			class="card preset-outlined-surface-200-800 bg-surface-50-950 pointer-events-auto flex max-h-[90vh] w-full max-w-2xl flex-col overflow-hidden p-0 shadow-xl"
			role="dialog"
			aria-modal="true"
			aria-labelledby="storage-restore-albums-preview-title"
			tabindex="-1"
			onpointerdown={(e) => e.stopPropagation()}
		>
			<div class="border-b border-surface-200-800 px-6 py-4">
				<h2 id="storage-restore-albums-preview-title" class="text-lg font-semibold text-(--color-surface-950-50)">
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
								onToggleSelect={toggleSelect ?? (() => {})}
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
						disabled={executing}
						onclick={() => selectAll?.()}
					>
						Select all new
					</button>
					<button
						type="button"
						class="text-(--color-surface-600-400) hover:underline disabled:opacity-50"
						disabled={executing}
						onclick={() => clearSelection?.()}
					>
						Clear
					</button>
				</div>
				<div class="flex gap-2">
					<button type="button" class="btn preset-tonal" disabled={executing} onclick={requestDismiss}>
						Cancel
					</button>
					<button
						type="button"
						class="btn preset-filled-primary-500"
						disabled={executing || selectedCount === 0}
						onclick={() => confirmCreate?.()}
					>
						{executing ? 'Creating…' : `Create selected (${selectedCount})`}
					</button>
				</div>
			</div>
		</div>
	</div>
</div>
