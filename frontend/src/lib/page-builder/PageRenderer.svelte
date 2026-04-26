<script lang="ts">
	import { setContext } from 'svelte';
	import { writable, type Writable } from 'svelte/store';
	import { page as pageStore } from '$app/stores';
	import type { PageData, PageModuleData } from '$lib/types/page-builder';
	import PageBuilderGrid from './PageBuilderGrid.svelte';
	import HeroModule from './modules/HeroModule.svelte';
	import RichTextModule from './modules/RichTextModule.svelte';
	import DividerModule from './modules/DividerModule.svelte';
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
	import { activeTemplate } from '$stores/template';
	import { normalizeTemplatePackId } from '$lib/template/packs/ids';
	import { TEMPLATE_PAGE_BUILDER_OVERRIDES } from './template-module-overrides';

	export let page: PageData | null = null;
	export let modules: PageModuleData[] = [];
	export let compact = false;

	/** Optional: merged into layout shell lookup (theme preview, unsaved admin overrides). */
	export let layoutPresetsPreview: Record<string, unknown> | null | undefined = undefined;

	const layoutPresetsPreviewStore: Writable<Record<string, unknown> | null> = writable(null);
	setContext('pbLayoutPresetsPreview', layoutPresetsPreviewStore);
	$: layoutPresetsPreviewStore.set(layoutPresetsPreview && typeof layoutPresetsPreview === 'object' ? layoutPresetsPreview : null);

	$: routeParams = ($pageStore.params || {}) as Record<string, string | undefined>;
	$: routeAlias =
		routeParams?.albumAlias ||
		routeParams?.alias ||
		routeParams?.id ||
		null;
	$: pageContext = {
		// Route params must win over page alias for role pages (e.g. album detail page alias = "album").
		alias: routeAlias || page?.alias || null,
		albumAlias: routeParams?.albumAlias || routeParams?.alias || null,
		params: routeParams,
		page
	};

	const baseModuleMap: Record<string, any> = {
		hero: HeroModule,
		richText: RichTextModule,
		divider: DividerModule,
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

	const moduleMapStore: Writable<Record<string, any>> = writable(baseModuleMap);
	setContext('pbModuleMap', moduleMapStore);

	$: moduleMap = {
		...baseModuleMap,
		...(TEMPLATE_PAGE_BUILDER_OVERRIDES[normalizeTemplatePackId(String($activeTemplate ?? ''))] || {})
	};
	$: moduleMapStore.set(moduleMap);
	setContext('pbNestDepth', 0);

	const normalizeModuleType = (t: unknown): string =>
		t === 'albumGallery' ? 'albumView' : String(t ?? '');
	$: normalizedModules = modules.map((m) => ({ ...m, type: normalizeModuleType((m as any).type) }));

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
	$: pageKey = String(page?._id ?? '').trim().toLowerCase();
	$: pageScopeClass = pageKey ? `pb-page pb-page-${pageKey}` : 'pb-page';
</script>

{#if !page}
	<div class="min-h-screen flex items-center justify-center text-[color:var(--tp-fg-muted)]">Page not found.</div>
{:else}
	<div
		class="{pageScopeClass} {compact ? 'w-full' : 'min-h-screen'} {compact ? '' : 'bg-[color:var(--tp-canvas)] text-[color:var(--tp-fg)]'}"
		data-page-key={pageKey || undefined}
	>
		<PageBuilderGrid modules={normalizedModules} layout={gridLayout} {compact} pageContext={pageContext} />
	</div>
{/if}
