<script lang="ts">
	import { createEventDispatcher, onMount } from 'svelte';
	import { page } from '$app/stores';
	import { goto } from '$app/navigation';
	// Using inline SVG icons
	import { currentLanguage } from '$stores/language';
	import { MultiLangUtils } from '$utils/multiLang';
	import { logger } from '$lib/utils/logger';

	export let isOpen = false;

	const dispatch = createEventDispatcher();

	interface AdvancedFilters {
		albumId: string | null;
		tags: string[];
		people: string[];
		locationIds: string[];
		dateFrom: string;
		dateTo: string;
	}

	let filters: AdvancedFilters = {
		albumId: null,
		tags: [],
		people: [],
		locationIds: [],
		dateFrom: '',
		dateTo: ''
	};

	let sectionsExpanded = {
		albums: true,
		tags: true,
		people: true,
		locations: true,
		dateRange: false
	};

	let availableAlbums: Array<{ _id: string; name: string | Record<string, string> }> = [];
	let availableTags: Array<{ _id: string; name: string | Record<string, string> }> = [];
	let availablePeople: Array<{ _id: string; name: string | Record<string, string> }> = [];
	let availableLocations: Array<{ _id: string; name: string | Record<string, string> }> = [];

	let loading = false;

	$: activeFilterCount =
		(filters.albumId ? 1 : 0) +
		filters.tags.length +
		filters.people.length +
		filters.locationIds.length;

	onMount(async () => {
		await loadFilterData();
	});

	async function loadFilterData() {
		try {
			// Load albums
			const albumsRes = await fetch('/api/albums?level=0');
			if (albumsRes.ok) {
				const albumsData = await albumsRes.json();
				availableAlbums = Array.isArray(albumsData) ? albumsData : albumsData.data || [];
			}

			// Load tags
			const tagsRes = await fetch('/api/tags');
			if (tagsRes.ok) {
				const tagsData = await tagsRes.json();
				availableTags = Array.isArray(tagsData) ? tagsData : tagsData.data || [];
			}

			// Load people
			const peopleRes = await fetch('/api/people');
			if (peopleRes.ok) {
				const peopleData = await peopleRes.json();
				availablePeople = Array.isArray(peopleData) ? peopleData : peopleData.data || [];
			}

			// Load locations
			const locationsRes = await fetch('/api/locations');
			if (locationsRes.ok) {
				const locationsData = await locationsRes.json();
				availableLocations = Array.isArray(locationsData)
					? locationsData
					: locationsData.data || [];
			}
		} catch (err) {
			logger.error('Failed to load filter data:', err);
		}
	}

	function toggleSection(section: keyof typeof sectionsExpanded) {
		sectionsExpanded[section] = !sectionsExpanded[section];
	}

	function handleFilterChange(newFilters: Partial<AdvancedFilters>) {
		filters = { ...filters, ...newFilters };
	}

	function clearAllFilters() {
		filters = {
			albumId: null,
			tags: [],
			people: [],
			locationIds: [],
			dateFrom: '',
			dateTo: ''
		};
	}

	function handleSubmit() {
		const params = new URLSearchParams();

		if (filters.albumId) {
			params.set('albumId', filters.albumId);
		}
		if (filters.tags.length > 0) {
			params.set('tags', filters.tags.join(','));
		}
		if (filters.people.length > 0) {
			params.set('people', filters.people.join(','));
		}
		if (filters.locationIds.length > 0) {
			params.set('locationIds', filters.locationIds.join(','));
		}

		const searchUrl = `/search${params.toString() ? `?${params.toString()}` : ''}`;
		goto(searchUrl);
		dispatch('close');
	}

	function getDisplayName(item: { name: string | Record<string, string> }): string {
		if (typeof item.name === 'string') return item.name;
		return MultiLangUtils.getTextValue(item.name, $currentLanguage) || '';
	}
</script>

{#if isOpen}
	<!-- Backdrop -->
	<div
		class="fixed inset-0 bg-black bg-opacity-50 z-[9999] flex items-center justify-center p-4 overflow-y-auto"
		on:click={() => dispatch('close')}
		role="button"
		tabindex="-1"
	>
		<!-- Modal -->
		<div
			class="bg-white rounded-lg shadow-xl w-full max-w-4xl max-h-[90vh] flex flex-col my-auto"
			on:click|stopPropagation
		>
			<!-- Header -->
			<div class="flex items-center justify-between p-6 border-b">
				<div class="flex items-center gap-3">
					<svg class="h-6 w-6 text-gray-600" fill="none" stroke="currentColor" viewBox="0 0 24 24">
						<path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M21 21l-6-6m2-5a7 7 0 11-14 0 7 7 0 0114 0z" />
					</svg>
					<h2 class="text-2xl font-bold text-gray-900">Search</h2>
					{#if activeFilterCount > 0}
						<span class="px-2 py-1 bg-blue-100 text-blue-800 rounded-full text-sm font-medium">
							{activeFilterCount} {activeFilterCount === 1 ? 'filter' : 'filters'}
						</span>
					{/if}
				</div>
				<button
					on:click={() => dispatch('close')}
					class="p-2 hover:bg-gray-100 rounded-full transition-colors"
					type="button"
				>
					<svg class="h-5 w-5 text-gray-600" fill="none" stroke="currentColor" viewBox="0 0 24 24">
						<path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M6 18L18 6M6 6l12 12" />
					</svg>
				</button>
			</div>

			<!-- Content -->
			<div class="flex-1 overflow-y-auto p-6">
				<div class="space-y-4">
					<!-- Albums Filter -->
					<div class="border rounded-lg">
						<button
							type="button"
							on:click={() => toggleSection('albums')}
							class="w-full flex items-center justify-between p-4 hover:bg-gray-50"
						>
							<h3 class="font-semibold text-gray-900">Albums</h3>
							{#if sectionsExpanded.albums}
								<svg class="h-5 w-5 text-gray-500" fill="none" stroke="currentColor" viewBox="0 0 24 24">
									<path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M5 15l7-7 7 7" />
								</svg>
							{:else}
								<svg class="h-5 w-5 text-gray-500" fill="none" stroke="currentColor" viewBox="0 0 24 24">
									<path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M19 9l-7 7-7-7" />
								</svg>
							{/if}
						</button>
						{#if sectionsExpanded.albums}
							<div class="p-4 border-t">
								<select
									bind:value={filters.albumId}
									on:change={(e) => handleFilterChange({ albumId: e.currentTarget.value || null })}
									class="w-full px-3 py-2 border border-gray-300 rounded-md"
								>
									<option value="">All Albums</option>
									{#each availableAlbums as album}
										<option value={album._id}>{getDisplayName(album)}</option>
									{/each}
								</select>
							</div>
						{/if}
					</div>

					<!-- Tags Filter -->
					<div class="border rounded-lg">
						<button
							type="button"
							on:click={() => toggleSection('tags')}
							class="w-full flex items-center justify-between p-4 hover:bg-gray-50"
						>
							<h3 class="font-semibold text-gray-900">Tags</h3>
							{#if sectionsExpanded.tags}
								<svg class="h-5 w-5 text-gray-500" fill="none" stroke="currentColor" viewBox="0 0 24 24">
									<path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M5 15l7-7 7 7" />
								</svg>
							{:else}
								<svg class="h-5 w-5 text-gray-500" fill="none" stroke="currentColor" viewBox="0 0 24 24">
									<path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M19 9l-7 7-7-7" />
								</svg>
							{/if}
						</button>
						{#if sectionsExpanded.tags}
							<div class="p-4 border-t space-y-2">
								{#each availableTags as tag}
									<label class="flex items-center">
										<input
											type="checkbox"
											checked={filters.tags.includes(tag._id)}
											on:change={(e) => {
												if (e.currentTarget.checked) {
													handleFilterChange({ tags: [...filters.tags, tag._id] });
												} else {
													handleFilterChange({
														tags: filters.tags.filter((id) => id !== tag._id)
													});
												}
											}}
											class="mr-2"
										/>
										<span>{getDisplayName(tag)}</span>
									</label>
								{/each}
							</div>
						{/if}
					</div>

					<!-- People Filter -->
					<div class="border rounded-lg">
						<button
							type="button"
							on:click={() => toggleSection('people')}
							class="w-full flex items-center justify-between p-4 hover:bg-gray-50"
						>
							<h3 class="font-semibold text-gray-900">People</h3>
							{#if sectionsExpanded.people}
								<svg class="h-5 w-5 text-gray-500" fill="none" stroke="currentColor" viewBox="0 0 24 24">
									<path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M5 15l7-7 7 7" />
								</svg>
							{:else}
								<svg class="h-5 w-5 text-gray-500" fill="none" stroke="currentColor" viewBox="0 0 24 24">
									<path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M19 9l-7 7-7-7" />
								</svg>
							{/if}
						</button>
						{#if sectionsExpanded.people}
							<div class="p-4 border-t space-y-2">
								{#each availablePeople as person}
									<label class="flex items-center">
										<input
											type="checkbox"
											checked={filters.people.includes(person._id)}
											on:change={(e) => {
												if (e.currentTarget.checked) {
													handleFilterChange({ people: [...filters.people, person._id] });
												} else {
													handleFilterChange({
														people: filters.people.filter((id) => id !== person._id)
													});
												}
											}}
											class="mr-2"
										/>
										<span>{getDisplayName(person)}</span>
									</label>
								{/each}
							</div>
						{/if}
					</div>

					<!-- Locations Filter -->
					<div class="border rounded-lg">
						<button
							type="button"
							on:click={() => toggleSection('locations')}
							class="w-full flex items-center justify-between p-4 hover:bg-gray-50"
						>
							<h3 class="font-semibold text-gray-900">Locations</h3>
							{#if sectionsExpanded.locations}
								<svg class="h-5 w-5 text-gray-500" fill="none" stroke="currentColor" viewBox="0 0 24 24">
									<path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M5 15l7-7 7 7" />
								</svg>
							{:else}
								<svg class="h-5 w-5 text-gray-500" fill="none" stroke="currentColor" viewBox="0 0 24 24">
									<path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M19 9l-7 7-7-7" />
								</svg>
							{/if}
						</button>
						{#if sectionsExpanded.locations}
							<div class="p-4 border-t space-y-2">
								{#each availableLocations as location}
									<label class="flex items-center">
										<input
											type="checkbox"
											checked={filters.locationIds.includes(location._id)}
											on:change={(e) => {
												if (e.currentTarget.checked) {
													handleFilterChange({
														locationIds: [...filters.locationIds, location._id]
													});
												} else {
													handleFilterChange({
														locationIds: filters.locationIds.filter((id) => id !== location._id)
													});
												}
											}}
											class="mr-2"
										/>
										<span>{getDisplayName(location)}</span>
									</label>
								{/each}
							</div>
						{/if}
					</div>
				</div>
			</div>

			<!-- Footer -->
			<div class="flex items-center justify-between p-6 border-t">
				<button
					type="button"
					on:click={clearAllFilters}
					class="px-4 py-2 text-gray-600 hover:text-gray-800"
					disabled={activeFilterCount === 0}
				>
					Clear All
				</button>
				<div class="flex gap-3">
					<button
						type="button"
						on:click={() => dispatch('close')}
						class="px-4 py-2 border border-gray-300 rounded-md hover:bg-gray-50"
					>
						Cancel
					</button>
					<button
						type="button"
						on:click={handleSubmit}
						class="px-4 py-2 bg-blue-600 text-white rounded-md hover:bg-blue-700"
					>
						Search
					</button>
				</div>
			</div>
		</div>
	</div>
{/if}
