<!-- Live preview for theme/template builder - uses PageRenderer with actual modules -->
<script lang="ts">
	import PageRenderer from '$lib/page-builder/PageRenderer.svelte';
	import { DEFAULT_PAGE_LAYOUTS, DEFAULT_PAGE_MODULES } from '$lib/constants/default-page-layouts';
    import type { PageData } from '$types/page-builder';

	export let tokens: {
		colors: { primary: string; secondary: string; accent: string; background: string; text: string; muted: string };
		fonts: { heading: string; body: string };
		layout: { maxWidth: string; containerPadding: string; gridGap: string };
	} = {
		colors: { primary: '#3B82F6', secondary: '#6B7280', accent: '#F59E0B', background: '#FFFFFF', text: '#111827', muted: '#6B7280' },
		fonts: { heading: 'Inter', body: 'Inter' },
		layout: { maxWidth: '1200px', containerPadding: '1rem', gridGap: '1.5rem' }
	};

	export let pageType: 'home' | 'gallery' | 'album' | 'search' | 'pageBuilder' | 'header' | 'footer' = 'home';
	export let pageModules: any[] | undefined = undefined;
	export let pageLayout: { gridRows?: number; gridColumns?: number } | undefined = undefined;

	// Use provided modules/layout or fall back to defaults
	$: modules = pageModules || DEFAULT_PAGE_MODULES[pageType] || [];
	$: layout = pageLayout || DEFAULT_PAGE_LAYOUTS[pageType] || { gridRows: 3, gridColumns: 1 };

	// Create page object for PageRenderer
	$: page = {
		_id: pageType,
		title: {},
		subtitle: {},
		layout
	};

	$: cssVars = `
		--os-primary: ${tokens.colors.primary};
		--os-secondary: ${tokens.colors.secondary};
		--os-accent: ${tokens.colors.accent};
		--os-background: ${tokens.colors.background};
		--os-text: ${tokens.colors.text};
		--os-muted: ${tokens.colors.muted};
		--os-font-heading: ${tokens.fonts.heading}, sans-serif;
		--os-font-body: ${tokens.fonts.body}, sans-serif;
		--os-max-width: ${tokens.layout.maxWidth};
		--os-padding: ${tokens.layout.containerPadding};
		--os-gap: ${tokens.layout.gridGap};
	`;
</script>

<div class="theme-preview-root rounded-lg overflow-hidden border border-gray-300 bg-white" style={cssVars}>
	<div
		class="preview-content min-h-[400px] p-4"
		style="
			background: var(--os-background);
			color: var(--os-text);
			font-family: var(--os-font-body);
		"
	>
		{#if modules.length > 0}
			<!-- Use PageRenderer with actual modules -->
			<PageRenderer page={page as PageData} modules={modules} />
		{:else}
			<!-- Fallback for page types without modules -->
			<div class="flex items-center justify-center h-full text-gray-400">
				<p>No modules configured for {pageType}</p>
			</div>
		{/if}
	</div>
</div>
