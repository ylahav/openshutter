<script lang="ts">
	import { onMount } from 'svelte';
	import { browser } from '$app/environment';
	import { currentLanguage } from '$stores/language';
	import { MultiLangUtils } from '$lib/utils/multiLang';
	import type { BlogCategoryLayoutConfig } from './types';

	export let config: BlogCategoryLayoutConfig = {};

	type CategoryRow = {
		alias: string;
		title: unknown;
		articleCount?: number;
	};

	let loading = true;
	let errorMessage: string | null = null;
	let categories: CategoryRow[] = [];

	function normTitle(cat: CategoryRow): string {
		const t = cat.title;
		if (t === null || t === undefined) return cat.alias || '';
		return MultiLangUtils.getTextValue(t as string | Record<string, string>, $currentLanguage) || cat.alias || '';
	}

	function hrefFor(cat: CategoryRow): string {
		const base = (config.articlesListPath ?? '/blog').replace(/\/$/, '') || '/blog';
		const q = new URLSearchParams({ category: cat.alias });
		return `${base}?${q.toString()}`;
	}

	$: layout = config.layout ?? 'chips';
	$: showCount = config.showCount === true;
	$: maxItemsRaw = config.maxItems ?? 10;
	$: maxItems = Math.min(100, Math.max(1, Number(maxItemsRaw) || 10));
	$: sortBy = config.sortBy === 'count' ? 'count' : 'name';
	$: categoryAliasFilter = typeof config.categoryAlias === 'string' ? config.categoryAlias.trim() : '';
	$: linkToArticles = config.linkToArticles === true;
	$: sectionTitle =
		config.title !== undefined && config.title !== null
			? MultiLangUtils.getTextValue(config.title, $currentLanguage)
			: '';

	$: sortedCategories = (() => {
		const list = categoryAliasFilter
			? categories.filter((c) => c.alias === categoryAliasFilter)
			: [...categories];
		if (sortBy === 'count') {
			list.sort((a, b) => (b.articleCount ?? 0) - (a.articleCount ?? 0) || normTitle(a).localeCompare(normTitle(b)));
		} else {
			list.sort((a, b) => normTitle(a).localeCompare(normTitle(b), undefined, { sensitivity: 'base' }));
		}
		return list.slice(0, maxItems);
	})();

	onMount(() => {
		if (!browser) return;

		const includeCounts = showCount ? 'true' : 'false';
		fetch(`/api/blog/categories?includeCounts=${includeCounts}`)
			.then((res) => res.json())
			.then((body) => {
				// Dev Vite proxy may return Nest body `{ categories }` without `success`; SvelteKit route wraps `{ success, data }`.
				if (body && body.success === false) {
					errorMessage = typeof body?.error === 'string' ? body.error : 'Failed to load categories';
					categories = [];
					return;
				}
				const payload =
					body?.data != null && typeof body.data === 'object' && !Array.isArray(body.data)
						? body.data
						: body;
				const list = Array.isArray((payload as { categories?: unknown[] })?.categories)
					? (payload as { categories: unknown[] }).categories
					: [];
				categories = list
					.map((c) => c as Record<string, unknown>)
					.filter((c) => c && typeof c.alias === 'string' && String(c.alias).trim() !== '')
					.map((c) => ({
						alias: String(c.alias).trim(),
						title: c.title,
						articleCount: typeof c.articleCount === 'number' ? c.articleCount : undefined
					}));
			})
			.catch(() => {
				errorMessage = 'Failed to load categories';
				categories = [];
			})
			.finally(() => {
				loading = false;
			});
	});
</script>

<section class="pb-blogCategory" aria-label={sectionTitle || 'Blog categories'}>
	{#if sectionTitle}
		<h2 class="pb-blogCategory__heading">{sectionTitle}</h2>
	{/if}

	{#if loading}
		<p class="pb-blogCategory__status">Loading categories…</p>
	{:else if errorMessage}
		<p class="pb-blogCategory__status">{errorMessage}</p>
	{:else if sortedCategories.length === 0}
		<p class="pb-blogCategory__status">No categories to show.</p>
	{:else if layout === 'list'}
		<ul class="pb-blogCategory__list">
			{#each sortedCategories as cat (cat.alias)}
				<li class="pb-blogCategory__listItem">
					{#if linkToArticles}
						<a href={hrefFor(cat)} class="pb-blogCategory__listLink">
							<span>{normTitle(cat)}</span>
							{#if showCount}
								<span class="pb-blogCategory__count">{cat.articleCount ?? 0}</span>
							{/if}
						</a>
					{:else}
						<span class="pb-blogCategory__listRow">
							<span>{normTitle(cat)}</span>
							{#if showCount}
								<span class="pb-blogCategory__count">{cat.articleCount ?? 0}</span>
							{/if}
						</span>
					{/if}
				</li>
			{/each}
		</ul>
	{:else}
		<div class="pb-blogCategory__chips">
			{#each sortedCategories as cat (cat.alias)}
				{#if linkToArticles}
					<a href={hrefFor(cat)} class="pb-blogCategory__chip pb-blogCategory__chip--interactive">
						{normTitle(cat)}
						{#if showCount}
							<span class="pb-blogCategory__count pb-blogCategory__count--chip">({cat.articleCount ?? 0})</span>
						{/if}
					</a>
				{:else}
					<span class="pb-blogCategory__chip">
						{normTitle(cat)}
						{#if showCount}
							<span class="pb-blogCategory__count pb-blogCategory__count--chip">({cat.articleCount ?? 0})</span>
						{/if}
					</span>
				{/if}
			{/each}
		</div>
	{/if}
</section>

<style lang="scss">
	.pb-blogCategory {
		color: var(--tp-fg);
	}

	.pb-blogCategory__heading {
		margin: 0 0 0.75rem;
		font-size: 1.125rem;
		font-weight: 600;
	}

	.pb-blogCategory__status {
		margin: 0;
		font-size: 0.875rem;
		color: var(--tp-fg-muted);
	}

	.pb-blogCategory__list {
		margin: 0;
		padding: 0;
		list-style: none;
		display: flex;
		flex-direction: column;
		gap: 0.5rem;
	}

	.pb-blogCategory__listItem {
		margin: 0;
	}

	.pb-blogCategory__listLink,
	.pb-blogCategory__listRow {
		display: flex;
		justify-content: space-between;
		align-items: center;
		gap: 0.5rem;
	}

	.pb-blogCategory__listLink {
		color: var(--os-primary);
		text-decoration: none;
	}
	.pb-blogCategory__listLink:hover {
		text-decoration: underline;
	}

	.pb-blogCategory__count {
		font-variant-numeric: tabular-nums;
		color: var(--tp-fg-subtle);
	}
	.pb-blogCategory__count--chip {
		margin-left: 0.125rem;
	}

	.pb-blogCategory__chips {
		display: flex;
		flex-wrap: wrap;
		gap: 0.5rem;
	}

	.pb-blogCategory__chip {
		display: inline-flex;
		align-items: center;
		gap: 0.375rem;
		padding: 0.25rem 0.75rem;
		border: 1px solid var(--tp-border);
		border-radius: 999px;
		font-size: 0.875rem;
		background: var(--tp-surface-2);
	}
	.pb-blogCategory__chip--interactive {
		color: inherit;
		text-decoration: none;
		cursor: pointer;
		transition: background 0.15s ease;
	}
	.pb-blogCategory__chip--interactive:hover {
		background: var(--tp-surface-3, var(--tp-surface-2));
	}
</style>
