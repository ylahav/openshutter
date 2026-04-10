<script lang="ts">
	import { setContext } from 'svelte';
	import { writable, type Writable } from 'svelte/store';
	import { currentLanguage } from '$stores/language';
	import { MultiLangUtils } from '$utils/multiLang';
	import { page as pageStore } from '$app/stores';
	import type { PageData, PageModuleData } from '$lib/types/page-builder';
	import PageBuilderGrid from './PageBuilderGrid.svelte';
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
	import LayoutShellModule from './modules/LayoutShellModule.svelte';
	import PageTitleModule from './modules/PageTitleModule.svelte';
	import LoginFormModule from './modules/LoginFormModule.svelte';

	export let page: PageData | null = null;
	export let modules: PageModuleData[] = [];
	export let compact = false;

	/** Optional: merged into layout shell lookup (theme preview, unsaved admin overrides). */
	export let layoutPresetsPreview: Record<string, unknown> | null | undefined = undefined;

	const layoutPresetsPreviewStore: Writable<Record<string, unknown> | null> = writable(null);
	setContext('pbLayoutPresetsPreview', layoutPresetsPreviewStore);
	$: layoutPresetsPreviewStore.set(layoutPresetsPreview && typeof layoutPresetsPreview === 'object' ? layoutPresetsPreview : null);

	$: pageContext = {
		alias: page?.alias || $pageStore.params?.alias || $pageStore.params?.id || null,
		params: $pageStore.params || {},
		page
	};

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
		blogCategory: BlogCategoryModule,
		blogArticle: BlogArticleModule,
		layoutShell: LayoutShellModule,
		pageTitle: PageTitleModule,
		loginForm: LoginFormModule
	};

	setContext('pbModuleMap', moduleMap);
	setContext('pbNestDepth', 0);

	$: titleText =
		page?.title !== undefined && page?.title !== null
			? MultiLangUtils.getTextValue(page.title, $currentLanguage)
			: '';
	$: subtitleText =
		page?.subtitle !== undefined && page?.subtitle !== null
			? MultiLangUtils.getTextValue(page.subtitle, $currentLanguage)
			: '';

	const normalizeModuleType = (t: unknown): string =>
		t === 'albumGallery' ? 'albumView' : String(t ?? '');
	$: normalizedModules = modules.map((m) => ({ ...m, type: normalizeModuleType((m as any).type) }));
	$: hasPageTitleModule = normalizedModules.some((m) => m.type === 'pageTitle');

	$: gridCols =
		page?.layout && typeof (page.layout as any).gridColumns === 'number'
			? (page.layout as any).gridColumns
			: Math.max(
					1,
					...modules.filter((m) => m.columnIndex !== undefined).map((m) => (m.columnIndex ?? 0) + (m.colSpan ?? 1))
				);
	$: gridRows =
		page?.layout && typeof (page.layout as any).gridRows === 'number'
			? (page.layout as any).gridRows
			: Math.max(
					1,
					...modules.filter((m) => m.rowOrder !== undefined).map((m) => (m.rowOrder ?? 0) + (m.rowSpan ?? 1))
				);

	$: gridLayout = { gridRows, gridColumns: gridCols };
</script>

{#if !page}
	<div class="min-h-screen flex items-center justify-center text-gray-500 dark:text-gray-400">Page not found.</div>
{:else}
	<div class="{compact ? 'w-full' : 'min-h-screen'} {compact ? '' : 'bg-white dark:bg-gray-900'}">
		{#if !compact && !hasPageTitleModule && (titleText || subtitleText)}
			<div class="max-w-4xl mx-auto px-4 py-12 text-center border-b border-gray-200 dark:border-gray-700">
				{#if titleText}
					<h1 class="text-4xl @md:text-5xl font-bold text-gray-900 dark:text-gray-100 mb-4">{titleText}</h1>
				{/if}
				{#if subtitleText}
					<h2 class="text-xl @md:text-2xl font-semibold text-gray-700 dark:text-gray-300">{subtitleText}</h2>
				{/if}
			</div>
		{/if}

		<PageBuilderGrid modules={normalizedModules} layout={gridLayout} {compact} pageContext={pageContext} />
	</div>
{/if}
