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

<section class="pb-blogArticle" aria-label={sectionTitle || 'Blog articles'}>
	{#if sectionTitle}
		<h2 class="pb-blogArticle__heading">{sectionTitle}</h2>
	{/if}

	{#if loading}
		<p class="pb-blogArticle__status">Loading…</p>
	{:else if errorMessage}
		<p class="pb-blogArticle__status">{errorMessage}</p>
	{:else if mode === 'single'}
		{#if !singleArticle}
			<p class="pb-blogArticle__status">No article to display.</p>
		{:else}
			<article class="pb-blogArticle__card">
				{#if showImage && singleArticle.leadingImage && typeof singleArticle.leadingImage === 'object' && (singleArticle.leadingImage as { url?: string }).url}
					<a href="{pathPrefix}/{singleArticle.slug}" class="pb-blogArticle__mediaLink">
						<img
							src={(singleArticle.leadingImage as { url: string }).url}
							alt={altOf(singleArticle)}
							class="pb-blogArticle__image pb-blogArticle__image--single"
						/>
					</a>
				{/if}
				<div class="pb-blogArticle__body">
					<h3 class="pb-blogArticle__title">
						<a href="{pathPrefix}/{singleArticle.slug}" class="pb-blogArticle__titleLink">
							{titleOf(singleArticle)}
						</a>
					</h3>
					{#if showMeta && singleArticle.publishedAt}
						<time class="pb-blogArticle__meta" datetime={String(singleArticle.publishedAt)}>
							{new Date(String(singleArticle.publishedAt)).toLocaleDateString()}
						</time>
					{/if}
					{#if showExcerpt && excerptPlain(singleArticle)}
						<p class="pb-blogArticle__excerpt">{excerptPlain(singleArticle)}</p>
					{/if}
				</div>
			</article>
		{/if}
	{:else if articles.length === 0}
		<p class="pb-blogArticle__status">No articles to show.</p>
	{:else}
		<ul class="pb-blogArticle__list">
			{#each articles as article (String(article._id ?? article.slug))}
				<li class="pb-blogArticle__card">
					{#if showImage && article.leadingImage && typeof article.leadingImage === 'object' && (article.leadingImage as { url?: string }).url}
						<a href="{pathPrefix}/{article.slug}" class="pb-blogArticle__mediaLink">
							<img
								src={(article.leadingImage as { url: string }).url}
								alt={altOf(article)}
								class="pb-blogArticle__image pb-blogArticle__image--list"
							/>
						</a>
					{/if}
					<div class="pb-blogArticle__body">
						<h3 class="pb-blogArticle__title">
							<a href="{pathPrefix}/{article.slug}" class="pb-blogArticle__titleLink">
								{titleOf(article)}
							</a>
						</h3>
						{#if showMeta && article.publishedAt}
							<time class="pb-blogArticle__meta" datetime={String(article.publishedAt)}>
								{new Date(String(article.publishedAt)).toLocaleDateString()}
							</time>
						{/if}
						{#if showExcerpt && excerptPlain(article)}
							<p class="pb-blogArticle__excerpt">{excerptPlain(article)}</p>
						{/if}
					</div>
				</li>
			{/each}
		</ul>
	{/if}
</section>

<style lang="scss">
	.pb-blogArticle {
		color: var(--tp-fg);
	}

	.pb-blogArticle__heading {
		margin: 0 0 1rem;
		font-size: 1.125rem;
		font-weight: 600;
	}

	.pb-blogArticle__status {
		margin: 0;
		font-size: 0.875rem;
		color: var(--tp-fg-muted);
	}

	.pb-blogArticle__list {
		margin: 0;
		padding: 0;
		list-style: none;
		display: flex;
		flex-direction: column;
		gap: 1.5rem;
	}

	.pb-blogArticle__card {
		margin: 0;
		overflow: hidden;
		border: 1px solid var(--tp-border);
		border-radius: 0.5rem;
		background: var(--tp-surface-2);
	}

	.pb-blogArticle__mediaLink {
		display: block;
	}

	.pb-blogArticle__image {
		display: block;
		width: 100%;
		object-fit: cover;
	}
	.pb-blogArticle__image--single {
		max-height: 14rem;
	}
	.pb-blogArticle__image--list {
		max-height: 11rem;
	}

	.pb-blogArticle__body {
		padding: 1rem;
	}

	.pb-blogArticle__title {
		margin: 0;
		font-size: 1rem;
		font-weight: 600;
	}

	.pb-blogArticle__titleLink {
		color: inherit;
		text-decoration: none;
	}
	.pb-blogArticle__titleLink:hover {
		color: var(--os-primary);
	}

	.pb-blogArticle__meta {
		display: block;
		margin-top: 0.25rem;
		font-size: 0.75rem;
		color: var(--tp-fg-subtle);
	}

	.pb-blogArticle__excerpt {
		margin: 0.5rem 0 0;
		font-size: 0.875rem;
		color: var(--tp-fg-muted);
		overflow: hidden;
		display: -webkit-box;
		-webkit-line-clamp: 3;
		-webkit-box-orient: vertical;
		line-clamp: 3;
	}
</style>
