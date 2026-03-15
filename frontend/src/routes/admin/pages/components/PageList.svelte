<script lang="ts">
	import type { Page, PageCategoryOption } from '../types';

	export let pages: Page[] = [];
	export let categories: PageCategoryOption[] = [];
	export let onEdit: (page: Page) => void = () => {};
	export let onDelete: (page: Page) => void = () => {};

	function getPageTitle(page: Page): string {
		const titleField = typeof page.title === 'string' ? page.title : page.title;
		if (typeof titleField === 'string') return titleField;
		return titleField?.en || titleField?.he || page.alias || '(No title)';
	}
</script>

<div class="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
	{#each pages as page}
		<div class="bg-white rounded-lg shadow-sm border border-gray-200 p-4">
			<div class="flex items-start justify-between mb-3">
				<div class="flex-1">
					<h3 class="font-semibold text-gray-900 mb-1">{getPageTitle(page)}</h3>
					<p class="text-sm text-gray-500">
						Alias: <code class="bg-gray-100 px-1 rounded">{page.alias}</code>
					</p>
				</div>

				<div class="flex space-x-1">
					<button
						type="button"
						on:click={() => onEdit(page)}
						class="p-1 text-gray-600 hover:text-blue-600 hover:bg-blue-50 rounded"
						aria-label="Edit page"
					>
						<svg class="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
							<path
								stroke-linecap="round"
								stroke-linejoin="round"
								stroke-width="2"
								d="M11 5H6a2 2 0 00-2 2v11a2 2 0 002 2h11a2 2 0 002-2v-5m-1.414-9.414a2 2 0 112.828 2.828L11.828 15H9v-2.828l8.586-8.586z"
							/>
						</svg>
					</button>
					<button
						type="button"
						on:click={() => onDelete(page)}
						class="p-1 text-gray-600 hover:text-red-600 hover:bg-red-50 rounded"
						aria-label="Delete page"
					>
						<svg class="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
							<path
								stroke-linecap="round"
								stroke-linejoin="round"
								stroke-width="2"
								d="M19 7l-.867 12.142A2 2 0 0116.138 21H7.862a2 2 0 01-1.995-1.858L5 7m5 4v6m4-6v6m1-10V4a1 1 0 00-1-1h-4a1 1 0 00-1 1v3M4 7h16"
							/>
						</svg>
					</button>
				</div>
			</div>

			<div class="flex items-center justify-between mt-3">
				<span
					class="px-2 py-1 text-xs font-medium rounded bg-gray-100 text-gray-800"
				>
					{categories.find((c) => c.value === page.category)?.label || page.category}
				</span>
				{#if page.isPublished}
					<span class="px-2 py-1 text-xs font-medium rounded bg-green-100 text-green-800">
						Published
					</span>
				{:else}
					<span class="px-2 py-1 text-xs font-medium rounded bg-yellow-100 text-yellow-800">
						Draft
					</span>
				{/if}
			</div>
		</div>
	{/each}
</div>
