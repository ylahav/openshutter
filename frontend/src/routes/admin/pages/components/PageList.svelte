<script lang="ts">
	import type { Page, PageCategoryOption } from '../types';

	export let pages: Page[] = [];
	export let categories: PageCategoryOption[] = [];
export let sortBy: 'title-asc' | 'title-desc' | 'alias-asc' | 'alias-desc' = 'title-asc';
export let groupByName = false;
	export let onEdit: (page: Page) => void = () => {};
	export let onDuplicate: (page: Page) => void = () => {};
	export let onDelete: (page: Page) => void = () => {};

	function getPageTitle(page: Page): string {
		const titleField = typeof page.title === 'string' ? page.title : page.title;
		if (typeof titleField === 'string') return titleField;
		return titleField?.en || titleField?.he || page.alias || '(No title)';
	}

	function getPagePacks(page: Page): string[] {
		const fromArray = Array.isArray(page.frontendTemplates) ? page.frontendTemplates : [];
		const normalized = fromArray
			.map((p) => String(p || '').trim().toLowerCase())
			.filter(Boolean);
		if (normalized.length) return Array.from(new Set(normalized));
		const single = String(page.frontendTemplate || '').trim().toLowerCase();
		return single ? [single] : [];
	}

	function getSortValue(page: Page, field: 'title' | 'alias'): string {
		return field === 'title' ? getPageTitle(page).toLowerCase() : String(page.alias || '').toLowerCase();
	}

	function comparePages(a: Page, b: Page): number {
		if (sortBy === 'title-asc') {
			return (
				getSortValue(a, 'title').localeCompare(getSortValue(b, 'title')) ||
				getSortValue(a, 'alias').localeCompare(getSortValue(b, 'alias'))
			);
		}
		if (sortBy === 'title-desc') {
			return (
				getSortValue(b, 'title').localeCompare(getSortValue(a, 'title')) ||
				getSortValue(a, 'alias').localeCompare(getSortValue(b, 'alias'))
			);
		}
		if (sortBy === 'alias-asc') {
			return (
				getSortValue(a, 'alias').localeCompare(getSortValue(b, 'alias')) ||
				getSortValue(a, 'title').localeCompare(getSortValue(b, 'title'))
			);
		}
		return (
			getSortValue(b, 'alias').localeCompare(getSortValue(a, 'alias')) ||
			getSortValue(a, 'title').localeCompare(getSortValue(b, 'title'))
		);
	}

	$: sortedPages = [...pages].sort(comparePages);
	$: groupedPages = (() => {
		const byTitle = new Map<string, Page[]>();
		for (const page of sortedPages) {
			const key = getPageTitle(page).trim().toLowerCase();
			const arr = byTitle.get(key) || [];
			arr.push(page);
			byTitle.set(key, arr);
		}
		return Array.from(byTitle.entries()).map(([key, items]) => ({
			key,
			title: getPageTitle(items[0]),
			pages: items,
			packs: Array.from(
				new Set(
					items
						.flatMap((p) => getPagePacks(p))
						.map((p) => p.trim().toLowerCase())
						.filter(Boolean)
				)
			).sort((a, b) => a.localeCompare(b))
		}));
	})();
</script>

{#if groupByName}
	<div class="space-y-4">
		{#each groupedPages as group}
			<div class="card preset-outlined-surface-200-800 bg-surface-50-950 p-4">
				<div class="flex flex-wrap items-center justify-between gap-2 mb-3">
					<div class="min-w-0">
						<h3 class="font-semibold text-(--color-surface-950-50) truncate">{group.title}</h3>
						<p class="text-xs text-(--color-surface-600-400)">
							{group.pages.length} variant{group.pages.length > 1 ? 's' : ''}
							{#if group.packs.length}
								· Packs:
								{#each group.packs as p, idx}
									<code>{p}</code>{#if idx < group.packs.length - 1},{/if}
								{/each}
							{/if}
						</p>
					</div>
				</div>

				<div class="space-y-2">
					{#each group.pages as page}
						<div class="rounded border border-surface-200-800 p-3">
							<div class="flex items-start justify-between gap-3">
								<div class="min-w-0">
									<p class="text-sm text-(--color-surface-700-300)">
										Alias: <code class="bg-(--color-surface-100-900) px-1 rounded">{page.alias}</code>
									</p>
									<p class="text-xs text-(--color-primary-600) mt-1">
										{#if page.pageRole}
											Role: <code>{page.pageRole}</code>
										{/if}
										{#if getPagePacks(page).length}
											{#if page.pageRole} · {/if}Packs:
											{#each getPagePacks(page) as p, idx}
												<code>{p}</code>{#if idx < getPagePacks(page).length - 1},{/if}
											{/each}
										{:else}
											{#if page.pageRole} · {/if}<span class="opacity-80">default variant</span>
										{/if}
									</p>
								</div>

								<div class="flex items-center gap-2 shrink-0">
									{#if page.isPublished}
										<span class="px-2 py-1 text-xs font-medium rounded bg-green-100 text-green-800">Published</span>
									{:else}
										<span class="px-2 py-1 text-xs font-medium rounded bg-yellow-100 text-yellow-800">Draft</span>
									{/if}
									<span class="px-2 py-1 text-xs font-medium rounded bg-(--color-surface-100-900) text-(--color-surface-900-100)">
										{categories.find((c) => c.value === page.category)?.label || page.category}
									</span>
									<button type="button" on:click={() => onEdit(page)} class="p-1 text-(--color-surface-600-400) hover:text-(--color-primary-600) rounded" aria-label="Edit page">
										<svg class="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M11 5H6a2 2 0 00-2 2v11a2 2 0 002 2h11a2 2 0 002-2v-5m-1.414-9.414a2 2 0 112.828 2.828L11.828 15H9v-2.828l8.586-8.586z"/></svg>
									</button>
									<button type="button" on:click={() => onDuplicate(page)} class="p-1 text-(--color-surface-600-400) hover:text-(--color-primary-600) rounded" aria-label="Duplicate page" title="Duplicate page">
										<svg class="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M8 16H6a2 2 0 01-2-2V6a2 2 0 012-2h8a2 2 0 012 2v2m-6 12h8a2 2 0 002-2v-8a2 2 0 00-2-2h-8a2 2 0 00-2 2v8a2 2 0 002 2z"/></svg>
									</button>
									<button type="button" on:click={() => onDelete(page)} class="p-1 text-(--color-surface-600-400) hover:text-red-600 rounded" aria-label="Delete page">
										<svg class="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M19 7l-.867 12.142A2 2 0 0116.138 21H7.862a2 2 0 01-1.995-1.858L5 7m5 4v6m4-6v6m1-10V4a1 1 0 00-1-1h-4a1 1 0 00-1 1v3M4 7h16"/></svg>
									</button>
								</div>
							</div>
						</div>
					{/each}
				</div>
			</div>
		{/each}
	</div>
{:else}
	<div class="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
		{#each sortedPages as page}
			<div class="card preset-outlined-surface-200-800 bg-surface-50-950 p-4">
				<div class="flex items-start justify-between mb-3">
					<div class="flex-1">
						<h3 class="font-semibold text-(--color-surface-950-50) mb-1">{getPageTitle(page)}</h3>
						<p class="text-sm text-(--color-surface-600-400)">
							Alias: <code class="bg-(--color-surface-100-900) px-1 rounded">{page.alias}</code>
						</p>
						{#if page.pageRole}
							<p class="text-xs text-(--color-primary-600) mt-1">
								Role: <code>{page.pageRole}</code>
								{#if getPagePacks(page).length}
									· Packs:
									{#each getPagePacks(page) as p, idx}
										<code>{p}</code>{#if idx < getPagePacks(page).length - 1},{/if}
									{/each}
								{:else}
									· <span class="opacity-80">default variant</span>
								{/if}
							</p>
						{/if}
					</div>

					<div class="flex space-x-1">
						<button type="button" on:click={() => onEdit(page)} class="p-1 text-(--color-surface-600-400) hover:text-(--color-primary-600) hover:bg-[color-mix(in_oklab,var(--color-primary-500)_14%,transparent)] rounded" aria-label="Edit page">
							<svg class="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M11 5H6a2 2 0 00-2 2v11a2 2 0 002 2h11a2 2 0 002-2v-5m-1.414-9.414a2 2 0 112.828 2.828L11.828 15H9v-2.828l8.586-8.586z"/></svg>
						</button>
						<button type="button" on:click={() => onDuplicate(page)} class="p-1 text-(--color-surface-600-400) hover:text-(--color-primary-600) hover:bg-[color-mix(in_oklab,var(--color-primary-500)_14%,transparent)] rounded" aria-label="Duplicate page" title="Duplicate page">
							<svg class="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M8 16H6a2 2 0 01-2-2V6a2 2 0 012-2h8a2 2 0 012 2v2m-6 12h8a2 2 0 002-2v-8a2 2 0 00-2-2h-8a2 2 0 00-2 2v8a2 2 0 002 2z"/></svg>
						</button>
						<button type="button" on:click={() => onDelete(page)} class="p-1 text-(--color-surface-600-400) hover:text-red-600 hover:bg-red-50 rounded" aria-label="Delete page">
							<svg class="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M19 7l-.867 12.142A2 2 0 0116.138 21H7.862a2 2 0 01-1.995-1.858L5 7m5 4v6m4-6v6m1-10V4a1 1 0 00-1-1h-4a1 1 0 00-1 1v3M4 7h16"/></svg>
						</button>
					</div>
				</div>

				<div class="flex items-center justify-between mt-3">
					<span class="px-2 py-1 text-xs font-medium rounded bg-(--color-surface-100-900) text-(--color-surface-900-100)">
						{categories.find((c) => c.value === page.category)?.label || page.category}
					</span>
					{#if page.isPublished}
						<span class="px-2 py-1 text-xs font-medium rounded bg-green-100 text-green-800">Published</span>
					{:else}
						<span class="px-2 py-1 text-xs font-medium rounded bg-yellow-100 text-yellow-800">Draft</span>
					{/if}
				</div>
			</div>
		{/each}
	</div>
{/if}
