<script lang="ts">
	import { browser } from '$app/environment';
	import { activeTemplate } from '$stores/template';
	import SearchForm from '$lib/components/search/SearchForm.svelte';
	import { searchModulesState, type SearchModuleFilters } from '$lib/components/search/search-modules-store';

	const templateSearchFormStyleLoaders = import.meta.glob('/src/templates/*/styles/_searchForm.scss');
	const defaultSearchFormStyleLoaders = import.meta.glob('/src/lib/page-builder/modules/SearchForm/_styles.scss');
	const loadedTemplateSearchFormStyles = new Set<string>();

	export let placeholder = '';
	export let showFiltersButton = true;
	export let filterWrapClass = '';

	let filters: SearchModuleFilters = {
		albumId: null,
		tags: [],
		people: [],
		locationIds: [],
		dateFrom: '',
		dateTo: '',
		sortOrder: 'desc'
	};
	let query = '';
	let loading = false;

	$: if (browser) {
		const templateId = String($activeTemplate || '').trim().toLowerCase();
		const templateStylePath = `/src/templates/${templateId}/styles/_searchForm.scss`;
		const defaultStylePath = '/src/lib/page-builder/modules/SearchForm/_styles.scss';
		const styleKey = templateId && templateSearchFormStyleLoaders[templateStylePath]
			? templateStylePath
			: defaultStylePath;

		if (!loadedTemplateSearchFormStyles.has(styleKey)) {
			const loader =
				templateSearchFormStyleLoaders[templateStylePath] ||
				defaultSearchFormStyleLoaders[defaultStylePath];
			if (loader) {
				void loader();
				loadedTemplateSearchFormStyles.add(styleKey);
			}
		}
	}

	searchModulesState.subscribe((state) => {
		query = state.query;
		filters = state.filters;
	});
</script>

<div class="w-full">
	<SearchForm
		{query}
		{loading}
		{placeholder}
		{showFiltersButton}
		{filterWrapClass}
		{filters}
		on:search={(e) => searchModulesState.update((state) => ({ ...state, query: e.detail }))}
		on:filtersChange={(e) => searchModulesState.update((state) => ({ ...state, filters: e.detail }))}
	/>
</div>
