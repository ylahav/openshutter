<!-- blogArticle: props documented in PageRenderer moduleMap -->
<script lang="ts">
	import Layout from './BlogArticle/Layout.svelte';
	import type { BlogArticleLayoutConfig } from './BlogArticle/types';

	export let title: string | Record<string, string> | undefined = undefined;
	export let mode: 'list' | 'single' = 'list';
	export let categoryAlias: string | undefined = undefined;
	export let syncCategoryFromPageUrl = true;
	export let slug: string | undefined = undefined;
	export let limit = 10;
	export let showImage = true;
	export let showExcerpt = true;
	export let showMeta = true;
	export let articlePathPrefix = '/blog';

	// svelte-ignore export_let_unused - passed by PageRenderer for all modules
	export let data: unknown = null;

	$: moduleConfig = {
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
	} satisfies BlogArticleLayoutConfig;
</script>

<Layout config={moduleConfig} />
