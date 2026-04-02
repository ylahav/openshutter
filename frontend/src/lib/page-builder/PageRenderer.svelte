<script lang="ts">
	import { currentLanguage } from '$stores/language';
	import { MultiLangUtils } from '$lib/utils/multiLang';
	import { page as pageStore } from '$app/stores';
	import type { PageData, PageModuleData } from '$lib/types/page-builder';
import HeroModule from './modules/HeroModule.svelte';
import RichTextModule from './modules/RichTextModule.svelte';
import FeatureGridModule from './modules/FeatureGridModule.svelte';
import AlbumsGridModule from './modules/AlbumsGridModule.svelte';
import AlbumGalleryModule from './modules/AlbumGalleryModule.svelte';
import CtaModule from './modules/CtaModule.svelte';
import LogoModule from './modules/LogoModule.svelte';
import SiteTitleModule from './modules/SiteTitleModule.svelte';
import MenuModule from './modules/MenuModule.svelte';
import LanguageSelectorModule from './modules/LanguageSelectorModule.svelte';
import ThemeToggleModule from './modules/ThemeToggleModule.svelte';
import ThemeSelectModule from './modules/ThemeSelectModule.svelte';
import UserGreetingModule from './modules/UserGreetingModule.svelte';
import AuthButtonsModule from './modules/AuthButtonsModule.svelte';
import SocialMediaModule from './modules/SocialMediaModule.svelte';
import BlogCategoryModule from './modules/BlogCategoryModule.svelte';
import BlogArticleModule from './modules/BlogArticleModule.svelte';

	export let page: PageData | null = null;
	export let modules: PageModuleData[] = [];
	export let compact = false; // For header/footer rendering

	// Extract URL parameters for page context (e.g., album alias)
	$: pageContext = {
		alias: page?.alias || $pageStore.params?.alias || $pageStore.params?.id || null,
		params: $pageStore.params || {}
	};

	// Only show title/subtitle if they're explicitly set (not undefined/null)
	$: titleText = (page?.title !== undefined && page?.title !== null) 
		? MultiLangUtils.getTextValue(page.title, $currentLanguage) 
		: '';
	$: subtitleText = (page?.subtitle !== undefined && page?.subtitle !== null)
		? MultiLangUtils.getTextValue(page.subtitle, $currentLanguage)
		: '';

	// Keep in sync with PAGE_MODULE_TYPES and Admin picker filters in templates/overrides.
	const moduleMap: Record<string, any> = {
		hero: HeroModule,
		richText: RichTextModule,
		featureGrid: FeatureGridModule,
		albumsGrid: AlbumsGridModule,
		albumView: AlbumGalleryModule,
		cta: CtaModule,
		logo: LogoModule,
		siteTitle: SiteTitleModule,
		menu: MenuModule,
		languageSelector: LanguageSelectorModule,
		themeToggle: ThemeToggleModule,
		themeSelect: ThemeSelectModule,
		userGreeting: UserGreetingModule,
		authButtons: AuthButtonsModule,
		socialMedia: SocialMediaModule,
		// blogCategory: title?, categoryAlias?, layout? ('chips'|'list'), showCount?, maxItems?, sortBy? ('name'|'count'), linkToArticles?, articlesListPath?
		blogCategory: BlogCategoryModule,
		// blogArticle: title?, mode? ('list'|'single'), categoryAlias?, syncCategoryFromPageUrl?, slug?, limit?, showImage?, showExcerpt?, showMeta?, articlePathPrefix?
		blogArticle: BlogArticleModule
	};

	// Build rows from modules
	interface RowData {
		rowOrder: number;
		columns: Array<{
			columnIndex: number;
			proportion: number;
			module?: PageModuleData;
		}>;
	}

	const normalizeModuleType = (t: unknown): string => (t === 'albumGallery' ? 'albumView' : String(t ?? ''));
	$: normalizedModules = modules.map((m) => ({ ...m, type: normalizeModuleType((m as any).type) }));
	$: rows = buildRows(normalizedModules);

	/** Infer grid size from modules (for spanning support) */
	$: gridCols = page?.layout && typeof (page.layout as any).gridColumns === 'number'
		? (page.layout as any).gridColumns
		: Math.max(1, ...modules.filter((m) => m.columnIndex !== undefined).map((m) => (m.columnIndex ?? 0) + (m.colSpan ?? 1)));
	$: gridRows = page?.layout && typeof (page.layout as any).gridRows === 'number'
		? (page.layout as any).gridRows
		: Math.max(1, ...modules.filter((m) => m.rowOrder !== undefined).map((m) => (m.rowOrder ?? 0) + (m.rowSpan ?? 1)));

	$: hasSpanning = normalizedModules.some((m) => (m.rowSpan ?? 1) > 1 || (m.colSpan ?? 1) > 1);

	function buildRows(moduleList: PageModuleData[]): RowData[] {
		const rowMap = new Map<number, RowData>();

		moduleList.forEach((module) => {
			if (module.rowOrder !== undefined && module.columnIndex !== undefined) {
				if (!rowMap.has(module.rowOrder)) {
					rowMap.set(module.rowOrder, {
						rowOrder: module.rowOrder,
						columns: []
					});
				}
				const row = rowMap.get(module.rowOrder)!;
				row.columns.push({
					columnIndex: module.columnIndex,
					proportion: module.columnProportion || 1,
					module
				});
			} else if (module.zone) {
				const rowOrder = module.order || 0;
				if (!rowMap.has(rowOrder)) {
					rowMap.set(rowOrder, { rowOrder, columns: [] });
				}
				rowMap.get(rowOrder)!.columns.push({
					columnIndex: 0,
					proportion: 1,
					module
				});
			}
		});

		rowMap.forEach((row) => row.columns.sort((a, b) => a.columnIndex - b.columnIndex));
		return Array.from(rowMap.values()).sort((a, b) => a.rowOrder - b.rowOrder);
	}

	/** Header/footer wrap in `.os-shell-container`; home/CMS pages constrain here. */
	$: contentMax = compact
		? 'w-full'
		: 'w-full max-w-[var(--os-max-width)] mx-auto px-[var(--os-padding)] box-border';
	$: contentGap = 'gap-[var(--os-gap)]';
</script>

{#if !page}
	<div class="min-h-screen flex items-center justify-center text-gray-500 dark:text-gray-400">Page not found.</div>
{:else}
	<div class="{compact ? 'w-full' : 'min-h-screen'} {compact ? '' : 'bg-white dark:bg-gray-900'}">
		{#if !compact && (titleText || subtitleText)}
			<div class="max-w-4xl mx-auto px-4 py-12 text-center border-b border-gray-200 dark:border-gray-700">
				{#if titleText}
					<h1 class="text-4xl md:text-5xl font-bold text-gray-900 dark:text-gray-100 mb-4">{titleText}</h1>
				{/if}
				{#if subtitleText}
					<h2 class="text-xl md:text-2xl font-semibold text-gray-700 dark:text-gray-300">{subtitleText}</h2>
				{/if}
			</div>
		{/if}

		{#if rows.length === 0}
			<div class="{compact ? 'w-full px-0' : contentMax} {compact ? 'py-2' : 'py-16'} text-center text-gray-500 dark:text-gray-400">
				No modules configured for this page yet.
			</div>
		{:else if hasSpanning}
			<div
				class="{compact ? 'w-full' : contentMax} {compact ? 'py-2' : 'py-6'} {contentGap}"
				style="display: grid; grid-template-columns: repeat({gridCols}, 1fr); grid-template-rows: repeat({gridRows}, auto);"
			>
				{#each normalizedModules.filter((m) => m.rowOrder !== undefined && m.columnIndex !== undefined) as module (module._id)}
					<div
						style="grid-column: {module.columnIndex! + 1} / span {module.colSpan ?? 1}; grid-row: {module.rowOrder! + 1} / span {module.rowSpan ?? 1}"
					>
					{#if moduleMap[module.type]}
						<svelte:component this={moduleMap[module.type]} {...module.props} data={pageContext} compact={compact} />
					{:else}
						<div class="p-6 text-sm text-gray-500 dark:text-gray-400">Unknown module: {module.type}</div>
					{/if}
					</div>
				{/each}
			</div>
		{:else}
			{#each rows as row (row.rowOrder)}
				{@const totalProportion = row.columns.reduce((sum, col) => sum + col.proportion, 0)}
				<div class="flex gap-4 px-4 {compact ? 'py-2' : 'py-6'}">
					{#each row.columns as col (col.columnIndex)}
						<div
							class="flex-1"
							style="flex: {col.proportion}"
						>
							{#if col.module}
								{#if moduleMap[col.module.type]}
									<svelte:component this={moduleMap[col.module.type]} {...col.module.props} data={pageContext} compact={compact} />
								{:else}
									<div class="{compact ? 'w-full' : contentMax} py-6 text-sm text-gray-500 dark:text-gray-400">
										Unknown module type: {col.module.type}
									</div>
								{/if}
							{/if}
						</div>
					{/each}
				</div>
			{/each}
		{/if}
	</div>
{/if}
