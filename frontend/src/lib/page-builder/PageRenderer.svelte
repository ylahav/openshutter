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
	import RootAlbumsListModule from './modules/RootAlbumsListModule.svelte';
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
	import ContactFormModule from './modules/ContactFormModule.svelte';
	import SearchBarModule from './modules/SearchBarModule.svelte';
	import SearchFilterModule from './modules/SearchFilterModule.svelte';
	import SearchFormModule from './modules/SearchFormModule.svelte';
	import SearchResultsModule from './modules/SearchResultsModule.svelte';
	import { activeTemplate } from '$stores/template';
	import { normalizeTemplatePackId } from '$lib/template/packs/ids';
	import { TEMPLATE_PAGE_BUILDER_OVERRIDES } from './template-module-overrides';

	let {
		page = null,
		modules = [],
		compact = false,
		layoutPresetsPreview = undefined
	}: {
		page?: PageData | null;
		modules?: PageModuleData[];
		compact?: boolean;
		layoutPresetsPreview?: Record<string, unknown> | null;
	} = $props();

	const layoutPresetsPreviewStore: Writable<Record<string, unknown> | null> = writable(null);

	const baseModuleMap: Record<string, unknown> = {
		hero: HeroModule,
		richText: RichTextModule,
		divider: DividerModule,
		featureGrid: FeatureGridModule,
		albumsGrid: AlbumsGridModule,
		rootAlbumsList: RootAlbumsListModule,
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
		loginForm: LoginFormModule,
		contactForm: ContactFormModule,
		searchBar: SearchBarModule,
		searchFilter: SearchFilterModule,
		searchForm: SearchFormModule,
		searchResults: SearchResultsModule
	};

	const moduleMapStore: Writable<Record<string, unknown>> = writable(baseModuleMap);

	setContext('pbLayoutPresetsPreview', layoutPresetsPreviewStore);
	setContext('pbModuleMap', moduleMapStore);
	setContext('pbNestDepth', 0);

	$effect(() => {
		layoutPresetsPreviewStore.set(
			layoutPresetsPreview && typeof layoutPresetsPreview === 'object'
				? layoutPresetsPreview
				: null
		);
	});

	const routeParams = $derived(($pageStore.params || {}) as Record<string, string | undefined>);
	const routeAlias = $derived(
		routeParams?.albumAlias || routeParams?.alias || routeParams?.id || null
	);
	const pageContext = $derived({
		alias: routeAlias || page?.alias || null,
		albumAlias: routeParams?.albumAlias || routeParams?.alias || null,
		params: routeParams,
		page
	});

	const moduleMap = $derived({
		...baseModuleMap,
		...(TEMPLATE_PAGE_BUILDER_OVERRIDES[
			normalizeTemplatePackId(String($activeTemplate ?? ''))
		] || {})
	});

	$effect(() => {
		moduleMapStore.set(moduleMap);
	});

	const normalizeModuleType = (t: unknown): string =>
		t === 'albumGallery' ? 'albumView' : String(t ?? '');

	const normalizedModules = $derived(
		modules.map((m) => ({
			...m,
			type: normalizeModuleType((m as { type?: unknown }).type)
		}))
	);

	const gridCols = $derived(
		page?.layout && typeof (page.layout as { gridColumns?: unknown }).gridColumns === 'number'
			? (page.layout as { gridColumns: number }).gridColumns
			: Math.max(
					1,
					...modules
						.filter((m) => m.columnIndex !== undefined)
						.map((m) => (m.columnIndex ?? 0) + (m.colSpan ?? 1))
				)
	);

	const gridRows = $derived(
		page?.layout && typeof (page.layout as { gridRows?: unknown }).gridRows === 'number'
			? (page.layout as { gridRows: number }).gridRows
			: Math.max(
					1,
					...modules
						.filter((m) => m.rowOrder !== undefined)
						.map((m) => (m.rowOrder ?? 0) + (m.rowSpan ?? 1))
				)
	);

	const gridLayout = $derived({ gridRows, gridColumns: gridCols });
	const pageKey = $derived(String(page?._id ?? '').trim().toLowerCase());
	const pageScopeClass = $derived(pageKey ? `pb-page pb-page-${pageKey}` : 'pb-page');
</script>

{#if !page}
	<div class="min-h-screen flex items-center justify-center text-(--tp-fg-muted)">
		Page not found.
	</div>
{:else}
	<div
		class="{pageScopeClass} {compact ? 'w-full' : 'min-h-screen'} {compact
			? ''
			: 'bg-(--tp-canvas) text-(--tp-fg)'}"
		data-page-key={pageKey || undefined}
	>
		<PageBuilderGrid
			modules={normalizedModules}
			layout={gridLayout}
			{compact}
			{pageContext}
		/>
	</div>
{/if}
