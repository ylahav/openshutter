<script lang="ts">
	import { currentLanguage } from '$stores/language';
	import { MultiLangUtils } from '$utils/multiLang';
	import { t } from '$stores/i18n';
	import { logger } from '$lib/utils/logger';
	import { hasActiveSearchFilters, type SearchModuleFilters } from './search-modules-store';
	import { untrack } from 'svelte';

	let {
		filters,
		showFiltersButton = true,
		buttonClass = '',
		chipsWrapClass = '',
		onchange = undefined
	}: {
		filters: SearchModuleFilters;
		showFiltersButton?: boolean;
		buttonClass?: string;
		chipsWrapClass?: string;
		onchange?: (detail: SearchModuleFilters) => void;
	} = $props();

	let showFilterPanel = $state(false);
	let loadingFilterOptions = $state(false);
	let filterOptions = $state<{ albums: any[]; tags: any[]; people: any[]; locations: any[] }>({
		albums: [],
		tags: [],
		people: [],
		locations: []
	});
	let draftFilters = $state<SearchModuleFilters>(untrack(() => ({ ...filters })));

	const activeFilters = $derived(
		filters || {
			albumId: null,
			tags: [],
			people: [],
			locationIds: [],
			dateFrom: '',
			dateTo: '',
			sortOrder: 'desc'
		}
	);

	function emitChange(next: SearchModuleFilters) {
		onchange?.(next);
	}

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

	function toArray(payload: any): any[] {
		if (Array.isArray(payload)) return payload;
		if (Array.isArray(payload?.data)) return payload.data;
		if (Array.isArray(payload?.items)) return payload.items;
		if (Array.isArray(payload?.results)) return payload.results;
		return [];
	}

	async function fetchFirstSuccessfulJson(urls: string[]): Promise<any> {
		for (const url of urls) {
			try {
				const res = await fetch(url, { credentials: 'include' });
				if (!res.ok) continue;
				return await res.json();
			} catch {
				// Try next fallback endpoint.
			}
		}
		return [];
	}

	async function loadFilterOptions() {
		if (loadingFilterOptions) return;
		loadingFilterOptions = true;
		try {
			const isAdminContext =
				typeof window !== 'undefined' && /^\/(admin|owner)(\/|$)/.test(window.location.pathname);
			const [albumsPayload, tagsData, peopleData, locationsData] = await Promise.all([
				fetchFirstSuccessfulJson(['/api/albums/hierarchy?includePrivate=false']),
				fetchFirstSuccessfulJson(
					isAdminContext
						? ['/api/admin/tags?limit=500', '/api/tags?limit=500']
						: ['/api/tags?limit=500', '/api/admin/tags?limit=500']
				),
				fetchFirstSuccessfulJson(
					isAdminContext
						? ['/api/admin/people?limit=500', '/api/people?limit=500']
						: ['/api/people?limit=500', '/api/admin/people?limit=500']
				),
				fetchFirstSuccessfulJson(
					isAdminContext
						? ['/api/admin/locations?limit=500', '/api/locations?limit=500']
						: ['/api/locations?limit=500', '/api/admin/locations?limit=500']
				)
			]);
			const albumsTree = toArray(albumsPayload);
			const tags = toArray(tagsData);
			const people = toArray(peopleData);
			const locations = toArray(locationsData);
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
		} finally {
			loadingFilterOptions = false;
		}
	}

	$effect(() => {
		if (
			hasActiveSearchFilters(activeFilters) &&
			filterOptions.tags.length === 0 &&
			filterOptions.people.length === 0 &&
			filterOptions.locations.length === 0
		) {
			void loadFilterOptions();
		}
	});

	async function openFilterPanel() {
		showFilterPanel = true;
		draftFilters = { ...activeFilters };
		if (filterOptions.albums.length > 0) return;
		await loadFilterOptions();
	}

	function applyFilterPanel() {
		emitChange({ ...draftFilters });
		showFilterPanel = false;
	}

	function removeFilterItem(filterType: 'tags' | 'people' | 'locationIds', id: string) {
		emitChange({
			...activeFilters,
			[filterType]: activeFilters[filterType].filter((itemId) => toIdString(itemId) !== toIdString(id))
		} as SearchModuleFilters);
	}
</script>

{#if showFiltersButton}
	<button
		type="button"
		onclick={openFilterPanel}
		class={`os-search-form__filters-btn ${buttonClass}`.trim()}
	>
		{$t('search.filters') || 'Filters'}
	</button>
{/if}

{#if hasActiveSearchFilters(activeFilters)}
	<div class={`os-search-filters mb-4 flex flex-wrap gap-2 ${chipsWrapClass}`.trim()}>
		{#if activeFilters.albumId}
			{@const albumName = filterOptions.albums.find((a) => toIdString(a._id) === toIdString(activeFilters.albumId))?.name ?? activeFilters.albumId}
			<span class="os-search-filters__chip">
				{$t('search.album')}: {albumName}
				<button type="button" onclick={() => emitChange({ ...activeFilters, albumId: null })} class="os-search-filters__chip-remove">×</button>
			</span>
		{/if}
		{#each activeFilters.tags as tagId}
			{@const tagName = getItemName(filterOptions.tags.find((t) => toIdString(t._id) === toIdString(tagId))) || tagId}
			<span class="os-search-filters__chip">
				{$t('search.tags')}: {tagName}
				<button type="button" onclick={() => removeFilterItem('tags', tagId)} class="os-search-filters__chip-remove">×</button>
			</span>
		{/each}
		{#each activeFilters.people as personId}
			{@const personName = getItemName(filterOptions.people.find((p) => toIdString(p._id) === toIdString(personId))) || personId}
			<span class="os-search-filters__chip">
				<span>{$t('search.people')}: {personName}</span>
				<button type="button" onclick={() => removeFilterItem('people', personId)} class="os-search-filters__chip-remove">×</button>
			</span>
		{/each}
		{#each activeFilters.locationIds as locationId}
			{@const locName = getItemName(filterOptions.locations.find((l) => toIdString(l._id) === toIdString(locationId))) || locationId}
			<span class="os-search-filters__chip">
				{$t('search.locations')}: {locName}
				<button type="button" onclick={() => removeFilterItem('locationIds', locationId)} class="os-search-filters__chip-remove">×</button>
			</span>
		{/each}
	</div>
{/if}

{#if showFilterPanel}
	<div class="os-search-filter-panel fixed inset-0 z-40 overflow-y-auto" aria-labelledby="filter-panel-title" role="dialog" aria-modal="true">
		<div class="os-search-filter-panel__container">
			<div class="os-search-filter-panel__backdrop" onclick={() => (showFilterPanel = false)} onkeydown={(e) => e.key === 'Escape' && (showFilterPanel = false)} role="button" tabindex="-1" aria-label="Close"></div>
			<div class="os-search-filter-panel__dialog">
				<h2 id="filter-panel-title" class="os-search-filter-panel__title">{$t('search.filters') || 'Filters'}</h2>
				<div class="os-search-filter-panel__body">
					<div class="os-search-filter-panel__field">
						<label for="filter-album" class="os-search-filter-panel__label">{$t('search.album') || 'Album'}</label>
						<select id="filter-album" class="os-search-filter-panel__input" bind:value={draftFilters.albumId}>
							<option value="">— {$t('search.any') || 'Any'} —</option>
							{#each filterOptions.albums as album}
								<option value={album._id}>{getItemName(album)}</option>
							{/each}
						</select>
					</div>
					<div class="os-search-filter-panel__field">
						<span class="os-search-filter-panel__label">{$t('search.tags') || 'Tags'}</span>
						<div class="os-search-filter-panel__checklist">
							{#if filterOptions.tags.length === 0}
								<span class="os-search-filter-panel__empty">No tags available</span>
							{/if}
							{#each filterOptions.tags as tag}
								{@const tagId = toIdString(tag._id)}
								{@const checked = draftFilters.tags.includes(tagId)}
								<label class="os-search-filter-panel__checkbox-item">
									<input
										type="checkbox"
										checked={checked}
										onchange={(e) => {
											if (e.currentTarget.checked) draftFilters = { ...draftFilters, tags: [...draftFilters.tags, tagId] };
											else draftFilters = { ...draftFilters, tags: draftFilters.tags.filter((id) => toIdString(id) !== tagId) };
										}}
									/>
									<span>{getItemName(tag)}</span>
								</label>
							{/each}
						</div>
					</div>
					<div class="os-search-filter-panel__field">
						<span class="os-search-filter-panel__label">{$t('search.people') || 'People'}</span>
						<div class="os-search-filter-panel__checklist">
							{#if filterOptions.people.length === 0}
								<span class="os-search-filter-panel__empty">No people available</span>
							{/if}
							{#each filterOptions.people as person}
								{@const personId = toIdString(person._id)}
								{@const checked = draftFilters.people.includes(personId)}
								<label class="os-search-filter-panel__checkbox-item">
									<input
										type="checkbox"
										checked={checked}
										onchange={(e) => {
											if (e.currentTarget.checked) draftFilters = { ...draftFilters, people: [...draftFilters.people, personId] };
											else draftFilters = { ...draftFilters, people: draftFilters.people.filter((id) => toIdString(id) !== personId) };
										}}
									/>
									<span>{getItemName(person)}</span>
								</label>
							{/each}
						</div>
					</div>
					<div class="os-search-filter-panel__field">
						<span class="os-search-filter-panel__label">{$t('search.locations') || 'Locations'}</span>
						<div class="os-search-filter-panel__checklist">
							{#if filterOptions.locations.length === 0}
								<span class="os-search-filter-panel__empty">No locations available</span>
							{/if}
							{#each filterOptions.locations as loc}
								{@const locId = toIdString(loc._id)}
								{@const checked = draftFilters.locationIds.includes(locId)}
								<label class="os-search-filter-panel__checkbox-item">
									<input
										type="checkbox"
										checked={checked}
										onchange={(e) => {
											if (e.currentTarget.checked) draftFilters = { ...draftFilters, locationIds: [...draftFilters.locationIds, locId] };
											else draftFilters = { ...draftFilters, locationIds: draftFilters.locationIds.filter((id) => toIdString(id) !== locId) };
										}}
									/>
									<span>{getItemName(loc)}</span>
								</label>
							{/each}
						</div>
					</div>
					<div class="os-search-filter-panel__date-grid">
						<div class="os-search-filter-panel__field">
							<label for="filter-dateFrom" class="os-search-filter-panel__label">{$t('search.dateFrom') || 'Date from'}</label>
							<input id="filter-dateFrom" type="date" class="os-search-filter-panel__input" bind:value={draftFilters.dateFrom} />
						</div>
						<div class="os-search-filter-panel__field">
							<label for="filter-dateTo" class="os-search-filter-panel__label">{$t('search.dateTo') || 'Date to'}</label>
							<input id="filter-dateTo" type="date" class="os-search-filter-panel__input" bind:value={draftFilters.dateTo} />
						</div>
					</div>
					<div class="os-search-filter-panel__field">
						<label for="filter-sort" class="os-search-filter-panel__label">{$t('search.sort') || 'Sort'}</label>
						<select id="filter-sort" class="os-search-filter-panel__input" bind:value={draftFilters.sortOrder}>
							<option value="desc">{$t('search.newestFirst') || 'Newest first'}</option>
							<option value="asc">{$t('search.oldestFirst') || 'Oldest first'}</option>
						</select>
					</div>
				</div>
				<div class="os-search-filter-panel__actions">
					<button type="button" onclick={() => (showFilterPanel = false)} class="os-search-filter-panel__cancel">
						{$t('search.cancel') || 'Cancel'}
					</button>
					<button type="button" onclick={applyFilterPanel} class="os-search-filter-panel__apply">
						{$t('search.apply') || 'Apply'}
					</button>
				</div>
			</div>
		</div>
	</div>
{/if}

<style>
	.os-search-form__filters-btn {
		padding: 0.5rem 1rem;
		font-size: 0.875rem;
		font-weight: 500;
		color: #374151;
		background: #fff;
		border: 1px solid #d1d5db;
		border-radius: 0.375rem;
		transition-property: background-color;
		transition-duration: 0.2s;
		transition-timing-function: ease;
	}

	.os-search-form__filters-btn:hover {
		background: #f9fafb;
	}

	.os-search-filters__chip {
		display: inline-flex;
		align-items: center;
		gap: 0.5rem;
		padding: 0.25rem 0.75rem;
		border-radius: 9999px;
		background: #dbeafe;
		color: #1e40af;
		font-size: 0.875rem;
	}

	.os-search-filters__chip-remove {
		background: transparent;
		border: 0;
		color: inherit;
		cursor: pointer;
		padding: 0;
		font-size: 1rem;
		line-height: 1;
	}

	.os-search-filters__chip-remove:hover {
		color: #1e3a8a;
	}

	.os-search-filter-panel__container {
		min-height: 100vh;
		display: flex;
		align-items: center;
		justify-content: center;
		padding: 1rem;
	}

	.os-search-filter-panel__backdrop {
		position: fixed;
		inset: 0;
		background: rgb(0 0 0 / 50%);
	}

	.os-search-filter-panel__dialog {
		position: relative;
		width: 100%;
		max-width: 32rem;
		max-height: 90vh;
		overflow-y: auto;
		padding: 1.5rem;
		background: #fff;
		border-radius: 0.5rem;
		box-shadow: 0 10px 15px -3px rgb(0 0 0 / 0.1), 0 4px 6px -4px rgb(0 0 0 / 0.1);
	}

	.os-search-filter-panel__title {
		margin: 0 0 1rem;
		font-size: 1.125rem;
		font-weight: 600;
		color: #111827;
	}

	.os-search-filter-panel__body {
		display: flex;
		flex-direction: column;
		gap: 1rem;
	}

	.os-search-filter-panel__field {
		display: flex;
		flex-direction: column;
	}

	.os-search-filter-panel__label {
		display: block;
		margin-bottom: 0.25rem;
		font-size: 0.875rem;
		font-weight: 500;
		color: #374151;
	}

	.os-search-filter-panel__input {
		width: 100%;
		padding: 0.5rem 0.75rem;
		font-size: 0.875rem;
		color: #111827;
		border: 1px solid #d1d5db;
		border-radius: 0.375rem;
		background: #fff;
	}

	.os-search-filter-panel__checklist {
		display: flex;
		flex-wrap: wrap;
		gap: 0.5rem;
		max-height: 8rem;
		overflow-y: auto;
		padding: 0.5rem;
		border: 1px solid #d1d5db;
		border-radius: 0.375rem;
	}

	.os-search-filter-panel__checkbox-item {
		display: inline-flex;
		align-items: center;
		gap: 0.25rem;
		font-size: 0.875rem;
		color: #111827;
	}

	.os-search-filter-panel__empty {
		font-size: 0.75rem;
		color: #6b7280;
	}

	.os-search-filter-panel__date-grid {
		display: grid;
		grid-template-columns: repeat(2, minmax(0, 1fr));
		gap: 0.75rem;
	}

	.os-search-filter-panel__actions {
		margin-top: 1.5rem;
		display: flex;
		justify-content: flex-end;
		gap: 0.5rem;
	}

	.os-search-filter-panel__cancel,
	.os-search-filter-panel__apply {
		padding: 0.5rem 1rem;
		font-size: 0.875rem;
		font-weight: 500;
		border-radius: 0.375rem;
		cursor: pointer;
		border: 1px solid transparent;
	}

	.os-search-filter-panel__cancel {
		background: #f3f4f6;
		color: #374151;
	}

	.os-search-filter-panel__cancel:hover {
		background: #e5e7eb;
	}

	.os-search-filter-panel__apply {
		background: #2563eb;
		color: #fff;
	}

	.os-search-filter-panel__apply:hover {
		background: #1d4ed8;
	}
</style>
