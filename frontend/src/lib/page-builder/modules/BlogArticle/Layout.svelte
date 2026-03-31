<script lang="ts">
	import { onMount } from 'svelte';
	import { browser } from '$app/environment';
	import { page } from '$app/stores';
	import { currentLanguage } from '$stores/language';
	import { MultiLangUtils } from '$lib/utils/multiLang';
	import type { BlogArticleLayoutConfig } from './types';

	export let config: BlogArticleLayoutConfig = {};

	type ArticleRow = Record<string, unknown>;

	let loading = true;
	let errorMessage: string | null = null;
	let articles: ArticleRow[] = [];
	let singleArticle: ArticleRow | null = null;

	$: mode = config.mode === 'single' ? 'single' : 'list';
	$: urlCategory = $page.url.searchParams.get('category')?.trim() ?? '';
	$: effectiveCategory =
		(config.categoryAlias && config.categoryAlias.trim()) ||
		(config.syncCategoryFromPageUrl !== false ? urlCategory : '') ||
		'';
	$: limit = Math.min(50, Math.max(1, Number(config.limit) || 10));
	$: showImage = config.showImage !== false;
	$: showExcerpt = config.showExcerpt !== false;
	$: showMeta = config.showMeta !== false;
	$: pathPrefix = (config.articlePathPrefix ?? '/blog').replace(/\/$/, '') || '/blog';

	$: sectionTitle =
		config.title !== undefined && config.title !== null
			? MultiLangUtils.getTextValue(config.title, $currentLanguage)
			: '';

	function titleOf(a: ArticleRow): string {
		return MultiLangUtils.getTextValue(a.title as string | Record<string, string>, $currentLanguage) || '';
	}

	function excerptPlain(a: ArticleRow): string {
		const ex = a.excerpt;
		if (!ex) return '';
		return MultiLangUtils.getHTMLValue(ex as string | Record<string, string>, $currentLanguage)
			.replace(/<[^>]+>/g, '')
			.slice(0, 220);
	}

	function altOf(a: ArticleRow): string {
		const img = a.leadingImage as { alt?: unknown } | undefined;
		if (!img?.alt) return titleOf(a);
		return MultiLangUtils.getTextValue(img.alt as string | Record<string, string>, $currentLanguage) || titleOf(a);
	}

	onMount(() => {
		if (!browser) {
			loading = false;
			return;
		}

		if (mode === 'list') {
			const sp = new URLSearchParams({ limit: String(limit), page: '1' });
			if (effectiveCategory) sp.set('category', effectiveCategory);
			fetch(`/api/blog?${sp}`)
				.then((r) => r.json())
				.then((body) => {
					if (!body?.success) {
						errorMessage = typeof body?.error === 'string' ? body.error : 'Failed to load';
						articles = [];
						return;
					}
					const raw = body.data as { articles?: ArticleRow[] };
					articles = Array.isArray(raw?.articles) ? raw.articles : [];
				})
				.catch(() => {
					errorMessage = 'Failed to load';
					articles = [];
				})
				.finally(() => {
					loading = false;
				});
			return;
		}

		const slug = (config.slug && config.slug.trim()) || '';
		if (!slug) {
			errorMessage = null;
			singleArticle = null;
			loading = false;
			return;
		}

		fetch(`/api/blog/${encodeURIComponent(slug)}`)
			.then((r) => r.json())
			.then((body) => {
				if (!body?.success) {
					errorMessage = typeof body?.error === 'string' ? body.error : 'Not found';
					singleArticle = null;
					return;
				}
				const raw = body.data as { article?: ArticleRow };
				singleArticle = raw?.article ?? null;
			})
			.catch(() => {
				errorMessage = 'Failed to load';
				singleArticle = null;
			})
			.finally(() => {
				loading = false;
			});
	});
</script>

<section class="text-gray-900 dark:text-gray-100" aria-label={sectionTitle || 'Blog articles'}>
	{#if sectionTitle}
		<h2 class="text-lg font-semibold mb-4">{sectionTitle}</h2>
	{/if}

	{#if loading}
		<p class="text-sm text-gray-500 dark:text-gray-400">Loading…</p>
	{:else if errorMessage}
		<p class="text-sm text-gray-500 dark:text-gray-400">{errorMessage}</p>
	{:else if mode === 'single'}
		{#if !singleArticle}
			<p class="text-sm text-gray-500 dark:text-gray-400">No article to display.</p>
		{:else}
			<article class="border border-gray-200 dark:border-gray-600 rounded-lg overflow-hidden bg-gray-50 dark:bg-gray-800/50">
				{#if showImage && singleArticle.leadingImage && typeof singleArticle.leadingImage === 'object' && (singleArticle.leadingImage as { url?: string }).url}
					<a href="{pathPrefix}/{singleArticle.slug}" class="block">
						<img
							src={(singleArticle.leadingImage as { url: string }).url}
							alt={altOf(singleArticle)}
							class="w-full max-h-56 object-cover"
						/>
					</a>
				{/if}
				<div class="p-4">
					<h3 class="text-base font-semibold">
						<a href="{pathPrefix}/{singleArticle.slug}" class="hover:text-primary-600 dark:hover:text-primary-400">
							{titleOf(singleArticle)}
						</a>
					</h3>
					{#if showMeta && singleArticle.publishedAt}
						<time class="text-xs text-gray-500 dark:text-gray-400 mt-1 block">
							{new Date(String(singleArticle.publishedAt)).toLocaleDateString()}
						</time>
					{/if}
					{#if showExcerpt && excerptPlain(singleArticle)}
						<p class="text-sm text-gray-600 dark:text-gray-300 mt-2 line-clamp-3">{excerptPlain(singleArticle)}</p>
					{/if}
				</div>
			</article>
		{/if}
	{:else if articles.length === 0}
		<p class="text-sm text-gray-500 dark:text-gray-400">No articles to show.</p>
	{:else}
		<ul class="space-y-6 list-none p-0 m-0">
			{#each articles as article (String(article._id ?? article.slug))}
				<li class="border border-gray-200 dark:border-gray-600 rounded-lg overflow-hidden bg-gray-50 dark:bg-gray-800/50">
					{#if showImage && article.leadingImage && typeof article.leadingImage === 'object' && (article.leadingImage as { url?: string }).url}
						<a href="{pathPrefix}/{article.slug}" class="block">
							<img
								src={(article.leadingImage as { url: string }).url}
								alt={altOf(article)}
								class="w-full max-h-44 object-cover"
							/>
						</a>
					{/if}
					<div class="p-4">
						<h3 class="text-base font-semibold">
							<a href="{pathPrefix}/{article.slug}" class="hover:text-primary-600 dark:hover:text-primary-400">
								{titleOf(article)}
							</a>
						</h3>
						{#if showMeta && article.publishedAt}
							<time class="text-xs text-gray-500 dark:text-gray-400 mt-1 block">
								{new Date(String(article.publishedAt)).toLocaleDateString()}
							</time>
						{/if}
						{#if showExcerpt && excerptPlain(article)}
							<p class="text-sm text-gray-600 dark:text-gray-300 mt-2 line-clamp-3">{excerptPlain(article)}</p>
						{/if}
					</div>
				</li>
			{/each}
		</ul>
	{/if}
</section>
