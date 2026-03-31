<!-- blogCategory: props documented in PageRenderer moduleMap -->
<script lang="ts">
	import Layout from './BlogCategory/Layout.svelte';
	import type { BlogCategoryLayoutConfig } from './BlogCategory/types';

	/** Section heading (optional); string or per-locale map */
	export let title: string | Record<string, string> | undefined = undefined;
	/** Optional category alias filter */
	export let categoryAlias: string | undefined = undefined;
	/** Visual layout */
	export let layout: 'chips' | 'list' = 'chips';
	/** Show published article counts (extra request aggregation on server when true) */
	export let showCount = false;
	export let maxItems = 10;
	export let sortBy: 'name' | 'count' = 'name';
	/** If true, each item links to articlesListPath?category=<alias> */
	export let linkToArticles = false;
	/** Base path for article listing (site-specific until a public /blog route exists) */
	export let articlesListPath = '/blog';

	// svelte-ignore export_let_unused - passed by PageRenderer for all modules
	export let data: unknown = null;

	$: moduleConfig = {
		title,
		categoryAlias,
		layout,
		showCount,
		maxItems,
		sortBy,
		linkToArticles,
		articlesListPath
	} satisfies BlogCategoryLayoutConfig;
</script>

<Layout config={moduleConfig} />
