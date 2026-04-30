<script lang="ts">
	import { createEventDispatcher } from 'svelte';
	import { currentLanguage } from '$stores/language';
	import { MultiLangUtils } from '$utils/multiLang';
	import { t } from '$stores/i18n';
	import { logger } from '$lib/utils/logger';
	import { hasActiveSearchFilters, type SearchModuleFilters } from './search-modules-store';

	export let filters: SearchModuleFilters;
	export let showFiltersButton = true;
	export let buttonClass = '';
	export let chipsWrapClass = '';

	const dispatch = createEventDispatcher<{
		change: SearchModuleFilters;
	}>();

	let showFilterPanel = false;
	let filterOptions: { albums: any[]; tags: any[]; people: any[]; locations: any[] } = {
		albums: [],
		tags: [],
		people: [],
		locations: []
	};
	let draftFilters: SearchModuleFilters = { ...filters };

	$: activeFilters = filters || {
		albumId: null,
		tags: [],
		people: [],
		locationIds: [],
		dateFrom: '',
		dateTo: '',
		sortOrder: 'desc'
	};

	function toIdString(id: any): string {
		if (id == null) return '';
		if (typeof id === 'string') return id;
		if (typeof id?.toString === 'function') {
			const s = id.toString();
			if (s && !s.startsWith('[object')) return s;
		}
		return String(id);
	}

	function getItemName(item: any): string {
		if (!item) return '';
		if (typeof item.name === 'string') return item.name;
		return MultiLangUtils.getTextValue(item.name || item.title || item.fullName || item.firstName || {}, $currentLanguage) || item._id || '';
	}

	async function openFilterPanel() {
		showFilterPanel = true;
		draftFilters = { ...activeFilters };
		if (filterOptions.albums.length > 0) return;
		try {
			const [albumsRes, tagsRes, peopleRes, locationsRes] = await Promise.all([
				fetch('/api/albums/hierarchy?includePrivate=false', { credentials: 'include' }),
				fetch('/api/tags?limit=500&isActive=true', { credentials: 'include' }),
				fetch('/api/people?limit=500&isActive=true', { credentials: 'include' }),
				fetch('/api/locations?limit=500&isActive=true', { credentials: 'include' })
			]);
			const albumsPayload = albumsRes.ok ? await albumsRes.json() : {};
			const tagsData = tagsRes.ok ? await tagsRes.json() : [];
			const peopleData = peopleRes.ok ? await peopleRes.json() : [];
			const locationsData = locationsRes.ok ? await locationsRes.json() : [];
			const albumsTree = Array.isArray(albumsPayload) ? albumsPayload : albumsPayload?.data ?? [];
			const tags = Array.isArray(tagsData) ? tagsData : tagsData?.data ?? [];
			const people = Array.isArray(peopleData) ? peopleData : peopleData?.data ?? [];
			const locations = Array.isArray(locationsData) ? locationsData : locationsData?.data ?? [];
			const flattenAlbums = (arr: any[], out: any[] = []): any[] => {
				for (const a of arr) {
					out.push({
						_id: toIdString(a._id),
						name: typeof a.name === 'object' ? MultiLangUtils.getTextValue(a.name, $currentLanguage) : a.name
					});
					if (a.children?.length) flattenAlbums(a.children, out);
				}
				return out;
			};
			filterOptions = {
				albums: flattenAlbums(albumsTree),
				tags: tags.map((t: any) => ({ ...t, _id: toIdString(t._id) })),
				people: people.map((p: any) => ({ ...p, _id: toIdString(p._id) })),
				locations: locations.map((l: any) => ({ ...l, _id: toIdString(l._id) }))
			};
		} catch (e) {
			logger.error('Failed to load filter options', e);
		}
	}

	function applyFilterPanel() {
		dispatch('change', { ...draftFilters });
		showFilterPanel = false;
	}

	function removeFilterItem(filterType: 'tags' | 'people' | 'locationIds', id: string) {
		dispatch('change', {
			...activeFilters,
			[filterType]: activeFilters[filterType].filter((itemId) => toIdString(itemId) !== toIdString(id))
		} as SearchModuleFilters);
	}
</script>

{#if showFiltersButton}
	<button
		type="button"
		on:click={openFilterPanel}
		class={`os-search-form__filters-btn px-4 py-2 text-sm font-medium text-gray-700 bg-white border border-gray-300 rounded-md hover:bg-gray-50 focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-blue-500 ${buttonClass}`.trim()}
	>
		{$t('search.filters') || 'Filters'}
	</button>
{/if}

{#if hasActiveSearchFilters(activeFilters)}
	<div class={`os-search-filters mb-4 flex flex-wrap gap-2 ${chipsWrapClass}`.trim()}>
		{#if activeFilters.albumId}
			{@const albumName = filterOptions.albums.find((a) => toIdString(a._id) === toIdString(activeFilters.albumId))?.name ?? activeFilters.albumId}
			<span class="os-search-filters__chip px-3 py-1 bg-blue-100 text-blue-800 rounded-full text-sm">
				{$t('search.album')}: {albumName}
				<button type="button" on:click={() => dispatch('change', { ...activeFilters, albumId: null })} class="os-search-filters__chip-remove ml-2 hover:text-blue-900">×</button>
			</span>
		{/if}
		{#each activeFilters.tags as tagId}
			{@const tagName = filterOptions.tags.find((t) => toIdString(t._id) === toIdString(tagId))?.name ?? tagId}
			<span class="os-search-filters__chip px-3 py-1 bg-blue-100 text-blue-800 rounded-full text-sm">
				{$t('search.tags')}: {tagName}
				<button type="button" on:click={() => removeFilterItem('tags', tagId)} class="os-search-filters__chip-remove ml-2 hover:text-blue-900">×</button>
			</span>
		{/each}
		{#each activeFilters.people as personId}
			{@const personName = getItemName(filterOptions.people.find((p) => toIdString(p._id) === toIdString(personId))) || personId}
			<span class="os-search-filters__chip px-3 py-1 bg-blue-100 rounded-full text-sm">
				<span class="text-blue-800">{$t('search.people')}: {personName}</span>
				<button type="button" on:click={() => removeFilterItem('people', personId)} class="os-search-filters__chip-remove ml-2 hover:text-blue-900">×</button>
			</span>
		{/each}
		{#each activeFilters.locationIds as locationId}
			{@const locName = getItemName(filterOptions.locations.find((l) => toIdString(l._id) === toIdString(locationId))) || locationId}
			<span class="os-search-filters__chip px-3 py-1 bg-blue-100 text-blue-800 rounded-full text-sm">
				{$t('search.locations')}: {locName}
				<button type="button" on:click={() => removeFilterItem('locationIds', locationId)} class="os-search-filters__chip-remove ml-2 hover:text-blue-900">×</button>
			</span>
		{/each}
	</div>
{/if}

{#if showFilterPanel}
	<div class="os-search-filter-panel fixed inset-0 z-40 overflow-y-auto" aria-labelledby="filter-panel-title" role="dialog" aria-modal="true">
		<div class="flex min-h-screen items-center justify-center p-4">
			<div class="os-search-filter-panel__backdrop fixed inset-0 bg-black/50 transition-opacity" on:click={() => (showFilterPanel = false)} on:keydown={(e) => e.key === 'Escape' && (showFilterPanel = false)} role="button" tabindex="-1" aria-label="Close"></div>
			<div class="os-search-filter-panel__dialog relative bg-white rounded-lg shadow-xl max-w-md w-full p-6 max-h-[90vh] overflow-y-auto">
				<h2 id="filter-panel-title" class="os-search-filter-panel__title text-lg font-semibold text-gray-900 mb-4">{$t('search.filters') || 'Filters'}</h2>
				<div class="os-search-filter-panel__body space-y-4">
					<div>
						<label for="filter-album" class="block text-sm font-medium text-gray-700 mb-1">{$t('search.album') || 'Album'}</label>
						<select id="filter-album" class="w-full px-3 py-2 border border-gray-300 rounded-md text-sm text-gray-900" bind:value={draftFilters.albumId}>
							<option value="">— {$t('search.any') || 'Any'} —</option>
							{#each filterOptions.albums as album}
								<option value={album._id}>{getItemName(album)}</option>
							{/each}
						</select>
					</div>
					<div>
						<span class="block text-sm font-medium text-gray-700 mb-1">{$t('search.tags') || 'Tags'}</span>
						<div class="flex flex-wrap gap-2 max-h-32 overflow-y-auto p-2 border border-gray-300 rounded-md">
							{#if filterOptions.tags.length === 0}
								<span class="text-xs text-gray-500">No tags available</span>
							{/if}
							{#each filterOptions.tags as tag}
								{@const tagId = toIdString(tag._id)}
								{@const checked = draftFilters.tags.includes(tagId)}
								<label class="inline-flex items-center gap-1 text-sm text-gray-900">
									<input
										type="checkbox"
										checked={checked}
										on:change={(e) => {
											if (e.currentTarget.checked) draftFilters = { ...draftFilters, tags: [...draftFilters.tags, tagId] };
											else draftFilters = { ...draftFilters, tags: draftFilters.tags.filter((id) => toIdString(id) !== tagId) };
										}}
									/>
									<span class="text-gray-900">{getItemName(tag)}</span>
								</label>
							{/each}
						</div>
					</div>
					<div>
						<span class="block text-sm font-medium text-gray-700 mb-1">{$t('search.people') || 'People'}</span>
						<div class="flex flex-wrap gap-2 max-h-32 overflow-y-auto p-2 border border-gray-300 rounded-md">
							{#if filterOptions.people.length === 0}
								<span class="text-xs text-gray-500">No people available</span>
							{/if}
							{#each filterOptions.people as person}
								{@const personId = toIdString(person._id)}
								{@const checked = draftFilters.people.includes(personId)}
								<label class="inline-flex items-center gap-1 text-sm text-gray-900">
									<input
										type="checkbox"
										checked={checked}
										on:change={(e) => {
											if (e.currentTarget.checked) draftFilters = { ...draftFilters, people: [...draftFilters.people, personId] };
											else draftFilters = { ...draftFilters, people: draftFilters.people.filter((id) => toIdString(id) !== personId) };
										}}
									/>
									<span class="text-gray-900">{getItemName(person)}</span>
								</label>
							{/each}
						</div>
					</div>
					<div>
						<span class="block text-sm font-medium text-gray-700 mb-1">{$t('search.locations') || 'Locations'}</span>
						<div class="flex flex-wrap gap-2 max-h-32 overflow-y-auto p-2 border border-gray-300 rounded-md">
							{#if filterOptions.locations.length === 0}
								<span class="text-xs text-gray-500">No locations available</span>
							{/if}
							{#each filterOptions.locations as loc}
								{@const locId = toIdString(loc._id)}
								{@const checked = draftFilters.locationIds.includes(locId)}
								<label class="inline-flex items-center gap-1 text-sm text-gray-900">
									<input
										type="checkbox"
										checked={checked}
										on:change={(e) => {
											if (e.currentTarget.checked) draftFilters = { ...draftFilters, locationIds: [...draftFilters.locationIds, locId] };
											else draftFilters = { ...draftFilters, locationIds: draftFilters.locationIds.filter((id) => toIdString(id) !== locId) };
										}}
									/>
									<span class="text-gray-900">{getItemName(loc)}</span>
								</label>
							{/each}
						</div>
					</div>
					<div class="grid grid-cols-2 gap-3">
						<div>
							<label for="filter-dateFrom" class="block text-sm font-medium text-gray-700 mb-1">{$t('search.dateFrom') || 'Date from'}</label>
							<input id="filter-dateFrom" type="date" class="w-full px-3 py-2 border border-gray-300 rounded-md text-sm text-gray-900" bind:value={draftFilters.dateFrom} />
						</div>
						<div>
							<label for="filter-dateTo" class="block text-sm font-medium text-gray-700 mb-1">{$t('search.dateTo') || 'Date to'}</label>
							<input id="filter-dateTo" type="date" class="w-full px-3 py-2 border border-gray-300 rounded-md text-sm text-gray-900" bind:value={draftFilters.dateTo} />
						</div>
					</div>
					<div>
						<label for="filter-sort" class="block text-sm font-medium text-gray-700 mb-1">{$t('search.sort') || 'Sort'}</label>
						<select id="filter-sort" class="w-full px-3 py-2 border border-gray-300 rounded-md text-sm text-gray-900" bind:value={draftFilters.sortOrder}>
							<option value="desc">{$t('search.newestFirst') || 'Newest first'}</option>
							<option value="asc">{$t('search.oldestFirst') || 'Oldest first'}</option>
						</select>
					</div>
				</div>
				<div class="os-search-filter-panel__actions mt-6 flex justify-end gap-2">
					<button type="button" on:click={() => (showFilterPanel = false)} class="os-search-filter-panel__cancel px-4 py-2 text-sm font-medium text-gray-700 bg-gray-100 rounded-md hover:bg-gray-200">
						{$t('search.cancel') || 'Cancel'}
					</button>
					<button type="button" on:click={applyFilterPanel} class="os-search-filter-panel__apply px-4 py-2 text-sm font-medium text-white bg-blue-600 rounded-md hover:bg-blue-700">
						{$t('search.apply') || 'Apply'}
					</button>
				</div>
			</div>
		</div>
	</div>
{/if}
