<script lang="ts">
	import type { Page, PageCategoryOption } from '../types';
	import type { MultiLangText } from '$lib/types/multi-lang';
	import { SUPPORTED_LANGUAGES } from '$lib/types/multi-lang';
	import { currentLanguage } from '$stores/language';
	import { t } from '$stores/i18n';
	import { adminBtnSecondary } from '$lib/admin/admin-cerberus';

	let {
		pages = [],
		categories = [],
		sortBy = 'title-asc',
		onEdit = () => {},
		onDuplicate = () => {},
		onDelete = () => {},
		onAddVariant = () => {}
	}: {
		pages?: Page[];
		categories?: PageCategoryOption[];
		sortBy?: 'title-asc' | 'title-desc' | 'alias-asc' | 'alias-desc';
		onEdit?: (page: Page) => void;
		onDuplicate?: (page: Page) => void;
		onDelete?: (page: Page) => void;
		onAddVariant?: (pages: Page[]) => void;
	} = $props();

	const lang = $derived($currentLanguage);
	const PACK_SORT: Record<string, number> = { atelier: 0, noir: 1, studio: 2 };

	const PAGE_ROLE_LABELS: Record<string, string> = {
		home: 'Home',
		gallery: 'Gallery',
		album: 'Album',
		login: 'Login',
		search: 'Search',
		blog: 'Blog',
		'blog-category': 'Blog Category',
		'blog-article': 'Blog Article'
	};

	const PACK_PRETTY: Record<string, string> = {
		noir: 'Noir',
		studio: 'Studio',
		atelier: 'Atelier'
	};

	/** Pick best title from multi-lang: if only one locale is filled, use it; if several, prefer current language then others. */
	function getBestTitleFromField(title: string | MultiLangText | undefined | null): string {
		if (title == null) return '';
		if (typeof title === 'string') return title.trim();
		const obj = title as MultiLangText;
		const tryCode = (code: string): string => {
			const v = obj[code];
			return typeof v === 'string' ? v.trim() : '';
		};
		const byCode = new Map<string, string>();
		for (const { code } of SUPPORTED_LANGUAGES) {
			const v = tryCode(code);
			if (v) byCode.set(code, v);
		}
		for (const [k, v] of Object.entries(obj)) {
			if (typeof v === 'string' && v.trim() && !byCode.has(k)) byCode.set(k, v.trim());
		}
		const filled = [...byCode.entries()];
		if (filled.length === 0) return '';
		if (filled.length === 1) return filled[0][1];
		const cur = byCode.get(lang);
		if (cur) return cur;
		for (const { code } of SUPPORTED_LANGUAGES) {
			const v = byCode.get(code);
			if (v) return v;
		}
		return filled[0][1];
	}

	function humanizeAliasAsTitle(alias: string): string {
		const a = String(alias || '').trim();
		if (!a) return '';
		return a
			.split(/[-_/]+/)
			.filter(Boolean)
			.map((w) => w.charAt(0).toUpperCase() + w.slice(1).toLowerCase())
			.join(' ');
	}

	/**
	 * List / accordion label: prefer any edited locale over a stale default in another language,
	 * then reserved role display name, then title-cased alias (not raw slugs).
	 */
	function getPageDisplayTitle(page: Page): string {
		const fromTitle = getBestTitleFromField(page.title as string | MultiLangText | undefined);
		if (fromTitle) return fromTitle;
		if (page.pageRole) {
			const r = humanizePageRole(page.pageRole);
			if (r) return r;
		}
		const fromAlias = humanizeAliasAsTitle(page.alias || '');
		if (fromAlias) return fromAlias;
		return '(No title)';
	}

	function humanizePageRole(role: string | undefined): string {
		if (!role) return '';
		const key = String(role).trim().toLowerCase();
		return PAGE_ROLE_LABELS[key] ?? role;
	}

	function getPagePacks(page: Page): string[] {
		const fromArray = Array.isArray(page.frontendTemplates) ? page.frontendTemplates : [];
		const normalized = fromArray
			.map((p) => String(p || '').trim().toLowerCase())
			.filter(Boolean);
		if (normalized.length) return Array.from(new Set(normalized));
		const single = String(page.frontendTemplate || '').trim().toLowerCase();
		return single ? [single] : [];
	}

	function primaryPackKey(page: Page): string {
		return getPagePacks(page)[0] || '';
	}

	function sortVariantPages(list: Page[]): Page[] {
		return [...list].sort((a, b) => {
			const pa = primaryPackKey(a);
			const pb = primaryPackKey(b);
			const oa = PACK_SORT[pa] ?? 99;
			const ob = PACK_SORT[pb] ?? 99;
			if (oa !== ob) return oa - ob;
			return (a.alias || '').localeCompare(b.alias || '');
		});
	}

	function humanizeTemplateVariant(page: Page): string {
		const packs = getPagePacks(page);
		if (!packs.length) return $t('admin.pagesListThemeDefault');
		return packs.map((p) => PACK_PRETTY[p] ?? p).join(' · ');
	}

	function isSystemPage(page: Page): boolean {
		return page.category === 'system';
	}

	/** True only for the un-overrideable default variant — system + no template assignment. */
	function isProtectedSystemPage(page: Page): boolean {
		if (page.category !== 'system') return false;
		const hasArray = Array.isArray(page.frontendTemplates) && page.frontendTemplates.length > 0;
		const hasLegacy = typeof page.frontendTemplate === 'string' && page.frontendTemplate.trim().length > 0;
		return !hasArray && !hasLegacy;
	}

	function isSystemGroup(pages: Page[]): boolean {
		return pages.length > 0 && pages.every((p) => isSystemPage(p));
	}

	function categoryBadgeLabel(page: Page): string {
		return categories.find((c) => c.value === page.category)?.label || page.category;
	}

	/** Representative category label for the group (same across variants). */
	function groupCategoryLabel(pages: Page[]): string {
		return categoryBadgeLabel(pages[0]);
	}

	function getSortValue(page: Page, field: 'title' | 'alias'): string {
		return field === 'title' ? getPageDisplayTitle(page).toLowerCase() : String(page.alias || '').toLowerCase();
	}

	function comparePages(a: Page, b: Page): number {
		if (sortBy === 'title-asc') {
			return (
				getSortValue(a, 'title').localeCompare(getSortValue(b, 'title')) ||
				getSortValue(a, 'alias').localeCompare(getSortValue(b, 'alias'))
			);
		}
		if (sortBy === 'title-desc') {
			return (
				getSortValue(b, 'title').localeCompare(getSortValue(a, 'title')) ||
				getSortValue(a, 'alias').localeCompare(getSortValue(b, 'alias'))
			);
		}
		if (sortBy === 'alias-asc') {
			return (
				getSortValue(a, 'alias').localeCompare(getSortValue(b, 'alias')) ||
				getSortValue(a, 'title').localeCompare(getSortValue(b, 'title'))
			);
		}
		return (
			getSortValue(b, 'alias').localeCompare(getSortValue(a, 'alias')) ||
			getSortValue(a, 'title').localeCompare(getSortValue(b, 'title'))
		);
	}

	const sortedPages = $derived([...pages].sort(comparePages));
	const groupedPages = $derived( (() => {
		const byTitle = new Map<string, Page[]>();
		for (const page of sortedPages) {
			const key = getPageDisplayTitle(page).trim().toLowerCase();
			const arr = byTitle.get(key) || [];
			arr.push(page);
			byTitle.set(key, arr);
		}
		return Array.from(byTitle.entries()).map(([, items]) => ({
			title: getPageDisplayTitle(items[0]),
			pages: sortVariantPages(items)
		}));
	})());

	const ALL_PACK_IDS = ['atelier', 'noir', 'studio'] as const;

	function usedPacksInGroup(pages: Page[]): Set<string> {
		const used = new Set<string>();
		for (const p of pages) {
			for (const id of getPagePacks(p)) {
				if ((ALL_PACK_IDS as readonly string[]).includes(id)) used.add(id);
			}
		}
		return used;
	}

	function canAddVariant(pages: Page[]): boolean {
		if (!pages.length || isSystemGroup(pages)) return false;
		const used = usedPacksInGroup(pages);
		return ALL_PACK_IDS.some((id) => !used.has(id));
	}
</script>

<div class="space-y-2">
	{#each groupedPages as group}
		{@const system = isSystemGroup(group.pages)}
		{@const addVariant = canAddVariant(group.pages)}
		<details
			class="card preset-outlined-surface-200-800 bg-surface-50-950 overflow-hidden rounded-lg border border-surface-200-800 {system
				? 'opacity-[0.88]'
				: ''}"
		>
			<summary
				class="cursor-pointer select-none list-none flex flex-wrap items-center gap-x-3 gap-y-2 px-4 py-3 text-(--color-surface-950-50) hover:bg-(--color-surface-100-900) [&::-webkit-details-marker]:hidden"
			>
				<span class="text-(--color-surface-500-500) select-none w-4 shrink-0" aria-hidden="true">▶</span>
				<span class="font-semibold text-base min-w-0 flex-1 truncate">{group.title}</span>
				<span class="text-sm text-(--color-surface-600-400) whitespace-nowrap shrink-0 inline-flex items-center gap-1">
					<span class="inline-flex items-center gap-1">
						{groupCategoryLabel(group.pages)}
						{#if system}
							<span class="select-none" aria-hidden="true" title={$t('admin.pagesListSystemPageHint')}>🔒</span>
						{/if}
					</span>
					<span class="text-(--color-surface-400-600)">·</span>
					<span>
						{group.pages.length === 1
							? $t('admin.pagesListVariantsCountOne')
							: $t('admin.pagesListVariantsCountMany').replace('{count}', String(group.pages.length))}
					</span>
				</span>
				{#if addVariant}
					<button
						type="button"
						class="{adminBtnSecondary} text-xs shrink-0"
						onclick={(e) => { e.stopPropagation(); e.preventDefault(); onAddVariant(group.pages); }}
					>
						+ {$t('admin.pagesListAddVariant')}
					</button>
				{:else if !system && !addVariant}
					<button
						type="button"
						disabled
						class="{adminBtnSecondary} text-xs shrink-0 opacity-50 cursor-not-allowed"
						title={$t('admin.pagesListAllVariantsExist')}
						onclick={(e) => { e.stopPropagation(); e.preventDefault(); }}
					>
						+ {$t('admin.pagesListAddVariant')}
					</button>
				{/if}
			</summary>

			<div class="border-t border-surface-200-800 bg-(--color-surface-50-950) px-4 py-3 space-y-0">
				{#each group.pages as page, i}
					{@const last = i === group.pages.length - 1}
					{@const branch = last ? '└' : '├'}
					<div
						class="flex flex-wrap items-center gap-x-3 gap-y-2 py-2 pl-1 {i > 0 ? 'border-t border-surface-200-800 border-dashed' : ''}"
					>
						<span class="font-mono text-sm text-(--color-surface-500-500) w-4 shrink-0 select-none" aria-hidden="true"
							>{branch}</span
						>
						<div class="min-w-0 flex-1">
							<p class="text-sm font-medium text-(--color-surface-950-50)">
								{humanizeTemplateVariant(page)}
								<span class="text-(--color-surface-500-500) font-normal">({page.alias})</span>
							</p>
							<details class="mt-1 text-xs text-(--color-surface-600-400)">
								<summary
									class="cursor-pointer select-none list-none text-(--color-primary-600) hover:underline [&::-webkit-details-marker]:hidden inline-block"
								>
									{$t('admin.pagesListTechnicalDetails')}
								</summary>
								<div class="mt-2 space-y-1 border-l-2 border-surface-200-800 pl-3">
									<p>
										<span class="font-medium text-(--color-surface-700-300)">{$t('admin.pagesListAliasLabel')}</span>
										<code class="bg-(--color-surface-100-900) px-1 rounded">{page.alias}</code>
									</p>
									{#if page.pageRole}
										<p>
											<span class="font-medium text-(--color-surface-700-300)">{$t('admin.pagesListRoleLabel')}</span>
											{humanizePageRole(page.pageRole)}
										</p>
									{/if}
									<p>
										<span class="font-medium text-(--color-surface-700-300)">{$t('admin.pagesListPacksLabel')}</span>
										{#if getPagePacks(page).length}
											{#each getPagePacks(page) as p, idx}
												<code class="bg-(--color-surface-100-900) px-1 rounded">{p}</code>{#if idx < getPagePacks(page).length - 1}, {/if}
											{/each}
										{:else}
											{$t('admin.pagesListThemeDefault')}
										{/if}
									</p>
								</div>
							</details>
						</div>

						<div class="flex items-center gap-2 shrink-0">
							{#if page.isPublished}
								<span class="px-2 py-0.5 text-xs font-medium rounded bg-green-100 text-green-800">Published</span>
							{:else}
								<span class="px-2 py-0.5 text-xs font-medium rounded bg-yellow-100 text-yellow-800">Draft</span>
							{/if}
							<button
								type="button"
								onclick={(e) => { e.stopPropagation(); onEdit(page); }}
								class="p-1.5 text-(--color-surface-600-400) hover:text-(--color-primary-600) rounded"
								aria-label="Edit page"
								title="Edit"
							>
								<svg class="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24"
									><path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M11 5H6a2 2 0 00-2 2v11a2 2 0 002 2h11a2 2 0 002-2v-5m-1.414-9.414a2 2 0 112.828 2.828L11.828 15H9v-2.828l8.586-8.586z" /></svg
								>
							</button>
							{#if isProtectedSystemPage(page)}
								<button
									type="button"
									disabled
									class="p-1.5 text-(--color-surface-400-600) opacity-50 cursor-not-allowed rounded"
									title={$t('admin.pagesListDeleteSystemDisabled')}
									aria-label={$t('admin.pagesListDeleteSystemDisabled')}
								>
									<svg class="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24"
										><path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M19 7l-.867 12.142A2 2 0 0116.138 21H7.862a2 2 0 01-1.995-1.858L5 7m5 4v6m4-6v6m1-10V4a1 1 0 00-1-1h-4a1 1 0 00-1 1v3M4 7h16" /></svg
									>
								</button>
							{:else}
								<button
									type="button"
									onclick={(e) => { e.stopPropagation(); onDelete(page); }}
									class="p-1.5 text-(--color-surface-600-400) hover:text-red-600 rounded"
									aria-label="Delete page"
									title="Delete"
								>
									<svg class="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24"
										><path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M19 7l-.867 12.142A2 2 0 0116.138 21H7.862a2 2 0 01-1.995-1.858L5 7m5 4v6m4-6v6m1-10V4a1 1 0 00-1-1h-4a1 1 0 00-1 1v3M4 7h16" /></svg
									>
								</button>
							{/if}
						</div>
					</div>
				{/each}
			</div>
		</details>
	{/each}
</div>

<style>
	/* Rotate disclosure chevron when open (summary first span) */
	details[open] > summary > span:first-child {
		transform: rotate(90deg);
		display: inline-block;
	}
</style>
