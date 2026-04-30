<!-- Live preview for theme/template builder - uses PageRenderer with actual modules -->
<script lang="ts">
	import PageRenderer from '$lib/page-builder/PageRenderer.svelte';
	import { DEFAULT_PAGE_LAYOUTS, DEFAULT_PAGE_MODULES } from '$lib/constants/default-page-layouts';
	import { buildGoogleFontsUrl } from '$lib/constants/google-fonts';
	import type { FontSetting } from '$lib/types/fonts';
	import type { PageData } from '$types/page-builder';
	import { buildShellLayoutCssVars } from '$lib/template/breakpoints';

	export let tokens: {
		colors: { primary: string; secondary: string; accent: string; background: string; text: string; muted: string };
		fonts: Record<string, string | FontSetting>;
		layout: { maxWidth: string; containerPadding: string; gridGap: string } & Record<string, string | undefined>;
	} = {
		colors: { primary: '#3B82F6', secondary: '#6B7280', accent: '#F59E0B', background: '#FFFFFF', text: '#111827', muted: '#6B7280' },
		fonts: { heading: 'Inter', body: 'Inter', links: 'Inter', lists: 'Inter', formInputs: 'Inter', formLabels: 'Inter' },
		layout: { maxWidth: '1200px', containerPadding: '1rem', gridGap: '1.5rem' }
	};

	function fontFamily(v: string | FontSetting): string {
		return typeof v === 'string' ? v : v.family;
	}
	function fontSize(v: string | FontSetting): string {
		return typeof v === 'string' ? 'inherit' : (v.size ?? 'inherit');
	}
	function fontWeight(v: string | FontSetting): string {
		return typeof v === 'string' ? 'inherit' : (v.weight ?? 'inherit');
	}

	export let pageType: 'home' | 'gallery' | 'album' | 'search' | 'login' | 'pageBuilder' | 'header' | 'footer' = 'home';
	export let templateName: 'noir' | 'studio' | 'atelier' = 'atelier';
	export let pageModules: any[] | undefined = undefined;
	export let pageLayout: { gridRows?: number; gridColumns?: number } | undefined = undefined;
	/** Named layout shells (merged over site template in preview). */
	export let layoutPresets: Record<string, unknown> | null | undefined = undefined;

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

	$: previewGoogleFontsUrl = buildGoogleFontsUrl(
		['heading', 'body', 'links', 'lists', 'formInputs', 'formLabels']
			.map((r) => fontFamily(tokens.fonts[r]))
			.filter(Boolean)
	);

	$: layoutShell = {
		maxWidth: tokens.layout.maxWidth,
		containerPadding: tokens.layout.containerPadding,
		gridGap: tokens.layout.gridGap,
		...tokens.layout
	};

	$: cssVars = `
		--os-primary: ${tokens.colors.primary};
		--os-secondary: ${tokens.colors.secondary};
		--os-accent: ${tokens.colors.accent};
		--os-background: ${tokens.colors.background};
		--os-text: ${tokens.colors.text};
		--os-muted: ${tokens.colors.muted};
		--os-font-heading: ${fontFamily(tokens.fonts.heading)}, sans-serif;
		--os-font-heading-size: ${fontSize(tokens.fonts.heading)};
		--os-font-heading-weight: ${fontWeight(tokens.fonts.heading)};
		--os-font-body: ${fontFamily(tokens.fonts.body)}, sans-serif;
		--os-font-body-size: ${fontSize(tokens.fonts.body)};
		--os-font-body-weight: ${fontWeight(tokens.fonts.body)};
		--os-font-links: ${fontFamily(tokens.fonts.links)}, sans-serif;
		--os-font-links-size: ${fontSize(tokens.fonts.links)};
		--os-font-links-weight: ${fontWeight(tokens.fonts.links)};
		--os-font-lists: ${fontFamily(tokens.fonts.lists)}, sans-serif;
		--os-font-lists-size: ${fontSize(tokens.fonts.lists)};
		--os-font-lists-weight: ${fontWeight(tokens.fonts.lists)};
		--os-font-form-inputs: ${fontFamily(tokens.fonts.formInputs)}, sans-serif;
		--os-font-form-inputs-size: ${fontSize(tokens.fonts.formInputs)};
		--os-font-form-inputs-weight: ${fontWeight(tokens.fonts.formInputs)};
		--os-font-form-labels: ${fontFamily(tokens.fonts.formLabels)}, sans-serif;
		--os-font-form-labels-size: ${fontSize(tokens.fonts.formLabels)};
		--os-font-form-labels-weight: ${fontWeight(tokens.fonts.formLabels)};
		${buildShellLayoutCssVars(layoutShell).trim()}
	`;
	$: previewPackClass = `tpl-pack-${templateName}`;
</script>

<svelte:head>
	{#if previewGoogleFontsUrl}
		<link id="theme-preview-google-fonts" rel="stylesheet" href={previewGoogleFontsUrl} />
	{/if}
</svelte:head>

<div
	class="@container theme-preview-root {previewPackClass} rounded-lg overflow-hidden border border-border bg-background min-w-0 max-w-full"
	style={cssVars}
>
	<div
		class="preview-content min-h-[400px] min-w-0 max-w-full overflow-x-auto p-2 sm:p-4"
		style="
			background: var(--os-background);
			color: var(--os-text);
			font-family: var(--os-font-body);
		"
	>
		{#if modules.length > 0}
			<!-- Use PageRenderer with actual modules -->
			<PageRenderer
				page={page as PageData}
				modules={modules}
				layoutPresetsPreview={layoutPresets}
				compact={pageType === 'header' || pageType === 'footer'}
			/>
		{:else}
			<!-- Fallback for page types without modules -->
			<div class="flex items-center justify-center h-full text-muted-foreground">
				<p>No modules configured for {pageType}</p>
			</div>
		{/if}
	</div>
</div>
