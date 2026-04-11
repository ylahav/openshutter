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

<section class="text-[color:var(--tp-fg)]" aria-label={sectionTitle || 'Blog categories'}>
	{#if sectionTitle}
		<h2 class="text-lg font-semibold mb-3">{sectionTitle}</h2>
	{/if}

	{#if loading}
		<p class="text-sm text-[color:var(--tp-fg-muted)]">Loading categories…</p>
	{:else if errorMessage}
		<p class="text-sm text-[color:var(--tp-fg-muted)]">{errorMessage}</p>
	{:else if sortedCategories.length === 0}
		<p class="text-sm text-[color:var(--tp-fg-muted)]">No categories to show.</p>
	{:else if layout === 'list'}
		<ul class="space-y-2 list-none p-0 m-0">
			{#each sortedCategories as cat (cat.alias)}
				<li>
					{#if linkToArticles}
						<a
							href={hrefFor(cat)}
							class="flex justify-between gap-2 text-[color:var(--os-primary)] hover:underline"
						>
							<span>{normTitle(cat)}</span>
							{#if showCount}
								<span class="text-[color:var(--tp-fg-subtle)] tabular-nums">{cat.articleCount ?? 0}</span>
							{/if}
						</a>
					{:else}
						<span class="flex justify-between gap-2">
							<span>{normTitle(cat)}</span>
							{#if showCount}
								<span class="text-[color:var(--tp-fg-subtle)] tabular-nums">{cat.articleCount ?? 0}</span>
							{/if}
						</span>
					{/if}
				</li>
			{/each}
		</ul>
	{:else}
		<div class="flex flex-wrap gap-2">
			{#each sortedCategories as cat (cat.alias)}
				{#if linkToArticles}
					<a
						href={hrefFor(cat)}
						class="inline-flex items-center gap-1.5 rounded-full border border-[color:var(--tp-border)] px-3 py-1 text-sm bg-[color:var(--tp-surface-2)] hover:bg-[color:var(--tp-surface-3)]"
					>
						{normTitle(cat)}
						{#if showCount}
							<span class="text-[color:var(--tp-fg-subtle)] tabular-nums">({cat.articleCount ?? 0})</span>
						{/if}
					</a>
				{:else}
					<span
						class="inline-flex items-center gap-1.5 rounded-full border border-[color:var(--tp-border)] px-3 py-1 text-sm bg-[color:var(--tp-surface-2)]"
					>
						{normTitle(cat)}
						{#if showCount}
							<span class="text-[color:var(--tp-fg-subtle)] tabular-nums">({cat.articleCount ?? 0})</span>
						{/if}
					</span>
				{/if}
			{/each}
		</div>
	{/if}
</section>
