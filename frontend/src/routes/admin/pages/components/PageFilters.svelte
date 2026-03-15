<script lang="ts">
	import type { PageCategoryOption } from '../types';

	export let searchTerm = '';
	export let categoryFilter = 'all';
	export let publishedFilter = 'all';
	export let categories: PageCategoryOption[] = [];
	export let onFilterChange: () => void = () => {};
	export let onAddPage: () => void = () => {};
</script>

<div class="flex items-center justify-between mb-6">
	<div class="flex items-center space-x-4">
		<div class="relative">
			<input
				type="text"
				placeholder="Search pages..."
				bind:value={searchTerm}
				on:input={onFilterChange}
				class="pl-10 pr-4 py-2 border border-gray-300 rounded-md shadow-sm focus:ring-2 focus:ring-blue-500 focus:border-blue-500 w-64"
			/>
			<svg
				class="absolute left-3 top-1/2 transform -translate-y-1/2 text-gray-400 h-4 w-4"
				fill="none"
				stroke="currentColor"
				viewBox="0 0 24 24"
			>
				<path
					stroke-linecap="round"
					stroke-linejoin="round"
					stroke-width="2"
					d="M21 21l-6-6m2-5a7 7 0 11-14 0 7 7 0 0114 0z"
				/>
			</svg>
		</div>

		<select
			bind:value={categoryFilter}
			on:change={onFilterChange}
			class="px-3 py-2 border border-gray-300 rounded-md shadow-sm focus:ring-2 focus:ring-blue-500 focus:border-blue-500"
		>
			<option value="all">All Categories</option>
			{#each categories as cat}
				<option value={cat.value}>{cat.label}</option>
			{/each}
		</select>

		<select
			bind:value={publishedFilter}
			on:change={onFilterChange}
			class="px-3 py-2 border border-gray-300 rounded-md shadow-sm focus:ring-2 focus:ring-blue-500 focus:border-blue-500"
		>
			<option value="all">All Status</option>
			<option value="true">Published</option>
			<option value="false">Draft</option>
		</select>
	</div>

	<button
		type="button"
		on:click={onAddPage}
		class="px-4 py-2 bg-blue-600 text-white rounded-md hover:bg-blue-700 text-sm font-medium flex items-center gap-2"
	>
		<svg class="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
			<path
				stroke-linecap="round"
				stroke-linejoin="round"
				stroke-width="2"
				d="M12 4v16m8-8H4"
			/>
		</svg>
		Add Page
	</button>
</div>
