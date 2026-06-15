<script lang="ts">
	import { adminBtnPrimarySm, adminRingPrimary } from '$lib/admin/admin-cerberus';
	import type { PageCategoryOption } from '../types';

	let {
		searchTerm = $bindable(''),
		categoryFilter = $bindable('all'),
		publishedFilter = $bindable('all'),
		sortBy = $bindable('title-asc'),
		categories = [],
		onFilterChange = () => {},
		onAddPage = () => {}
	}: {
		searchTerm?: string;
		categoryFilter?: string;
		publishedFilter?: string;
		sortBy?: string;
		categories?: PageCategoryOption[];
		onFilterChange?: () => void;
		onAddPage?: () => void;
	} = $props();
</script>

<div class="flex items-center justify-between mb-6">
	<div class="flex items-center space-x-4">
		<div class="relative">
			<input
				type="text"
				placeholder="Search pages..."
				bind:value={searchTerm}
				oninput={onFilterChange}
				class="pl-10 pr-4 py-2 border border-surface-300-700 rounded-md shadow-sm focus:ring-2 focus:ring-(--color-primary-500) focus:border-(--color-primary-500) w-64"
			/>
			<svg
				class="absolute left-3 top-1/2 transform -translate-y-1/2 text-(--color-surface-400-600) h-4 w-4"
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
			onchange={onFilterChange}
			class="px-3 py-2 border border-surface-300-700 rounded-md shadow-sm focus:ring-2 focus:ring-(--color-primary-500) focus:border-(--color-primary-500)"
		>
			<option value="all">All Categories</option>
			{#each categories as cat}
				<option value={cat.value}>{cat.label}</option>
			{/each}
		</select>

		<select
			bind:value={publishedFilter}
			onchange={onFilterChange}
			class="px-3 py-2 border border-surface-300-700 rounded-md shadow-sm focus:ring-2 focus:ring-(--color-primary-500) focus:border-(--color-primary-500)"
		>
			<option value="all">All Status</option>
			<option value="true">Published</option>
			<option value="false">Draft</option>
		</select>

		<select
			bind:value={sortBy}
			onchange={onFilterChange}
			class="px-3 py-2 border border-surface-300-700 rounded-md shadow-sm focus:ring-2 focus:ring-(--color-primary-500) focus:border-(--color-primary-500)"
		>
			<option value="title-asc">Title A-Z</option>
			<option value="title-desc">Title Z-A</option>
			<option value="alias-asc">Alias A-Z</option>
			<option value="alias-desc">Alias Z-A</option>
		</select>
	</div>

	<button
		type="button"
		onclick={onAddPage}
		class="{adminBtnPrimarySm} {adminRingPrimary} flex items-center gap-2"
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
