<!-- blogArticle: props documented in PageRenderer moduleMap -->
<script lang="ts">
	import Layout from './BlogArticle/Layout.svelte';
	import type { BlogArticleLayoutConfig } from './BlogArticle/types';

	let {
		title = undefined,
		mode = 'list',
		categoryAlias = undefined,
		syncCategoryFromPageUrl = true,
		slug = undefined,
		limit = 10,
		showImage = true,
		showExcerpt = true,
		showMeta = true,
		articlePathPrefix = '/blog',
		data = null,
		compact,
		...rest
	}: {
		title?: string | Record<string, string>;
		mode?: 'list' | 'single';
		categoryAlias?: string;
		syncCategoryFromPageUrl?: boolean;
		slug?: string;
		limit?: number;
		showImage?: boolean;
		showExcerpt?: boolean;
		showMeta?: boolean;
		articlePathPrefix?: string;
		data?: unknown;
		compact?: boolean;
		[key: string]: unknown;
	} = $props();

	const moduleConfig = $derived({
		...(rest as BlogArticleLayoutConfig),
		title,
		mode,
		categoryAlias,
		syncCategoryFromPageUrl,
		slug,
		limit,
		showImage,
		showExcerpt,
		showMeta,
		articlePathPrefix
	}) satisfies BlogArticleLayoutConfig;
</script>

<Layout config={moduleConfig} />
