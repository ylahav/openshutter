<script lang="ts">
	import { currentLanguage } from '$stores/language';
	import { MultiLangUtils } from '$lib/utils/multiLang';
	import { productName } from '$stores/siteConfig';

	export let data: {
		article: Record<string, unknown> | null;
		loadError: string | null;
	};

	$: article = data.article;
	$: titleText = article
		? MultiLangUtils.getTextValue(article.title as any, $currentLanguage)
		: '';
	$: contentHtml = article
		? MultiLangUtils.getHTMLValue(article.content as any, $currentLanguage)
		: '';
	$: seoDesc = article?.excerpt
		? MultiLangUtils.getTextValue(article.excerpt as any, $currentLanguage).replace(/<[^>]+>/g, '').slice(0, 160)
		: '';

	function altText(): string {
		if (!article?.leadingImage || typeof article.leadingImage !== 'object') return titleText;
		const alt = (article.leadingImage as { alt?: unknown }).alt;
		return alt ? MultiLangUtils.getTextValue(alt as any, $currentLanguage) : titleText;
	}
</script>

<svelte:head>
	<title>{titleText ? `${titleText} — ${$productName}` : `Blog — ${$productName}`}</title>
	{#if seoDesc}
		<meta name="description" content={seoDesc} />
	{/if}
</svelte:head>

<div class="min-h-screen bg-white dark:bg-gray-900 text-gray-900 dark:text-gray-100">
	<div class="os-shell-container max-w-(--os-max-width) py-10">
		<a href="/blog" class="text-sm text-primary-600 dark:text-primary-400 hover:underline mb-8 inline-block">
			← Back to blog
		</a>

		{#if data.loadError || !article}
			<p class="text-gray-500 dark:text-gray-400">{data.loadError || 'Article not found.'}</p>
		{:else}
			<article>
				<header class="mb-8">
					<h1 class="text-3xl font-bold">{titleText}</h1>
					{#if article.publishedAt}
						<time class="text-sm text-gray-500 dark:text-gray-400 mt-2 block" datetime={String(article.publishedAt)}>
							{new Date(String(article.publishedAt)).toLocaleDateString()}
						</time>
					{/if}
				</header>

				{#if article.leadingImage && typeof article.leadingImage === 'object' && (article.leadingImage as { url?: string }).url}
					<img
						src={(article.leadingImage as { url: string }).url}
						alt={altText()}
						class="w-full rounded-lg object-cover max-h-96 mb-8"
					/>
				{/if}

				{#if contentHtml}
					<div class="prose prose-gray dark:prose-invert max-w-none blog-article-body">
						<!-- eslint-disable-next-line svelte/no-at-html-tags -->
						{@html contentHtml}
					</div>
				{/if}
			</article>
		{/if}
	</div>
</div>

<style>
	:global(.blog-article-body) :global(p) {
		margin-top: 1rem;
		margin-bottom: 1rem;
	}
	:global(.blog-article-body) :global(h2),
	:global(.blog-article-body) :global(h3) {
		margin-top: 1.5rem;
		font-weight: 600;
	}
</style>
