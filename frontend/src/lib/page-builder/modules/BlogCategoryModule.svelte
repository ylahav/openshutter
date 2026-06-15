<!-- blogCategory: props documented in PageRenderer moduleMap -->
<script lang="ts">
	import Layout from './BlogCategory/Layout.svelte';
	import type { BlogCategoryLayoutConfig } from './BlogCategory/types';

	let {
		title = undefined,
		categoryAlias = undefined,
		layout = 'chips',
		showCount = false,
		maxItems = 10,
		sortBy = 'name',
		linkToArticles = false,
		articlesListPath = '/blog',
		data = null,
		compact,
		...rest
	}: {
		title?: string | Record<string, string>;
		categoryAlias?: string;
		layout?: 'chips' | 'list';
		showCount?: boolean;
		maxItems?: number;
		sortBy?: 'name' | 'count';
		linkToArticles?: boolean;
		articlesListPath?: string;
		data?: unknown;
		compact?: boolean;
		[key: string]: unknown;
	} = $props();

	const moduleConfig = $derived({
		...(rest as BlogCategoryLayoutConfig),
		title,
		categoryAlias,
		layout,
		showCount,
		maxItems,
		sortBy,
		linkToArticles,
		articlesListPath
	}) satisfies BlogCategoryLayoutConfig;
</script>

<Layout config={moduleConfig} />
