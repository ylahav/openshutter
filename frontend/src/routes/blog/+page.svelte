<script lang="ts">
	import { currentLanguage } from '$stores/language';
	import { MultiLangUtils } from '$lib/utils/multiLang';
	import { productName } from '$stores/siteConfig';

	export let data: {
		articles: Array<Record<string, unknown>>;
		pagination: { page: number; limit: number; total: number; pages: number };
		category: string;
		loadError: string | null;
	};

	function titleOf(a: Record<string, unknown>): string {
		return MultiLangUtils.getTextValue(a.title as any, $currentLanguage) || '';
	}

	function excerptOf(a: Record<string, unknown>): string {
		const ex = a.excerpt as unknown;
		if (!ex) return '';
		return MultiLangUtils.getHTMLValue(ex as any, $currentLanguage).replace(/<[^>]+>/g, '').slice(0, 220);
	}

	function altOf(a: Record<string, unknown>): string {
		const img = a.leadingImage as { alt?: unknown } | undefined;
		if (!img?.alt) return titleOf(a);
		return MultiLangUtils.getTextValue(img.alt as any, $currentLanguage) || titleOf(a);
	}

	$: listTitle = data.category
		? `${$productName} — blog (${data.category})`
		: `${$productName} — blog`;
</script>

<svelte:head>
	<title>{listTitle}</title>
</svelte:head>

<div class="min-h-screen bg-white dark:bg-gray-900 text-gray-900 dark:text-gray-100">
	<div class="os-shell-container max-w-[var(--os-max-width)] py-10">
		<header class="mb-10">
			<h1 class="text-3xl font-bold">Blog</h1>
			{#if data.category}
				<p class="mt-2 text-gray-600 dark:text-gray-400">Category: {data.category}</p>
				<a href="/blog" class="text-sm text-primary-600 dark:text-primary-400 hover:underline mt-2 inline-block">
					View all posts
				</a>
			{/if}
		</header>

		{#if data.loadError}
			<p class="text-red-600 dark:text-red-400">{data.loadError}</p>
		{:else if data.articles.length === 0}
			<p class="text-gray-500 dark:text-gray-400">No published articles yet.</p>
		{:else}
			<ul class="space-y-10 list-none p-0 m-0">
				{#each data.articles as article (String(article._id ?? article.slug))}
					<li>
						<article class="border-b border-gray-200 dark:border-gray-700 pb-10">
							{#if article.leadingImage && typeof article.leadingImage === 'object' && (article.leadingImage as { url?: string }).url}
								<a href="/blog/{article.slug}" class="block mb-4">
									<img
										src={(article.leadingImage as { url: string }).url}
										alt={altOf(article)}
										class="w-full rounded-lg object-cover max-h-64"
									/>
								</a>
							{/if}
							<h2 class="text-xl font-semibold">
								<a href="/blog/{article.slug}" class="hover:text-primary-600 dark:hover:text-primary-400">
									{titleOf(article)}
								</a>
							</h2>
							{#if article.publishedAt}
								<time class="text-sm text-gray-500 dark:text-gray-400" datetime={String(article.publishedAt)}>
									{new Date(String(article.publishedAt)).toLocaleDateString()}
								</time>
							{/if}
							{#if excerptOf(article)}
								<p class="mt-3 text-gray-600 dark:text-gray-300 line-clamp-3">{excerptOf(article)}</p>
							{/if}
							<a
								href="/blog/{article.slug}"
								class="inline-block mt-3 text-sm font-medium text-primary-600 dark:text-primary-400 hover:underline"
							>
								Read more
							</a>
						</article>
					</li>
				{/each}
			</ul>

			{#if data.pagination.pages > 1}
				<nav class="mt-10 flex gap-4 text-sm" aria-label="Pagination">
					{#if data.pagination.page > 1}
						<a
							class="text-primary-600 dark:text-primary-400 hover:underline"
							href="/blog?page={data.pagination.page - 1}{data.category ? `&category=${encodeURIComponent(data.category)}` : ''}"
						>
							Previous
						</a>
					{/if}
					<span class="text-gray-500 dark:text-gray-400">
						Page {data.pagination.page} of {data.pagination.pages}
					</span>
					{#if data.pagination.page < data.pagination.pages}
						<a
							class="text-primary-600 dark:text-primary-400 hover:underline"
							href="/blog?page={data.pagination.page + 1}{data.category ? `&category=${encodeURIComponent(data.category)}` : ''}"
						>
							Next
						</a>
					{/if}
				</nav>
			{/if}
		{/if}
	</div>
</div>
