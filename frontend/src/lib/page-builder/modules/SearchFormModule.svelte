<script lang="ts">
	import { browser } from '$app/environment';
	import { activeTemplate } from '$stores/template';
	import SearchForm from '$lib/components/search/SearchForm.svelte';
	import { searchModulesState } from '$lib/components/search/search-modules-store';

	const templateSearchFormStyleLoaders = import.meta.glob('/src/templates/*/styles/_searchForm.scss');
	const defaultSearchFormStyleLoaders = import.meta.glob('/src/lib/page-builder/modules/SearchForm/_styles.scss');
	const loadedTemplateSearchFormStyles = new Set<string>();

	let {
		placeholder = '',
		showFiltersButton = true,
		filterWrapClass = ''
	}: {
		placeholder?: string;
		showFiltersButton?: boolean;
		filterWrapClass?: string;
	} = $props();

	let loading = $state(false);
	const query = $derived($searchModulesState.query);
	const filters = $derived($searchModulesState.filters);

	$effect(() => {
		if (!browser) return;
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
		onsearch={(value) => searchModulesState.update((state) => ({ ...state, query: value }))}
		onfiltersChange={(detail) => searchModulesState.update((state) => ({ ...state, filters: detail }))}
	/>
</div>
