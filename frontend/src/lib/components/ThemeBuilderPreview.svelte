<!-- Live preview for theme/template builder - applies design tokens as CSS variables -->
<script lang="ts">
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
		{#if pageType === 'home'}
			<!-- Home preview -->
			<div class="space-y-4" style="max-width: var(--os-max-width); margin: 0 auto;">
				<div class="h-24 rounded-lg flex items-center justify-center" style="background: var(--os-primary); color: white;">
					<span style="font-family: var(--os-font-heading); font-size: 1.5rem;">Hero Section</span>
				</div>
				<div class="text-center py-4">
					<h2 style="font-family: var(--os-font-heading); color: var(--os-text);">Welcome to the Gallery</h2>
					<p style="color: var(--os-muted);">Sample album previews below</p>
				</div>
				<div class="grid grid-cols-3 gap-2">
					{#each [1, 2, 3] as i}
						<div class="aspect-video rounded-lg p-2 flex items-center justify-center" style="background: var(--os-secondary); color: white; opacity: 0.8;">
							Album {i}
						</div>
					{/each}
				</div>
			</div>
		{:else if pageType === 'gallery'}
			<!-- Gallery preview -->
			<div class="space-y-4" style="max-width: var(--os-max-width); margin: 0 auto;">
				<h1 style="font-family: var(--os-font-heading); color: var(--os-text);">Albums</h1>
				<div class="grid grid-cols-2 gap-3" style="gap: var(--os-gap);">
					{#each [1, 2, 3, 4, 5, 6] as i}
						<div class="rounded-lg overflow-hidden border" style="border-color: var(--os-muted);">
							<div class="h-20" style="background: var(--os-primary); opacity: 0.6;"></div>
							<div class="p-2" style="background: var(--os-background);">
								<span style="color: var(--os-text);">Collection {i}</span>
								<p class="text-xs" style="color: var(--os-muted);">12 photos</p>
							</div>
						</div>
					{/each}
				</div>
			</div>
		{:else if pageType === 'album'}
			<!-- Album preview -->
			<div class="space-y-4" style="max-width: var(--os-max-width); margin: 0 auto;">
				<div class="flex justify-between items-center">
					<h1 style="font-family: var(--os-font-heading); color: var(--os-text);">Summer 2024</h1>
					<span class="px-3 py-1 rounded-full text-sm" style="background: var(--os-accent); color: white;">View All</span>
				</div>
				<div class="grid grid-cols-4 gap-2" style="gap: var(--os-gap);">
					{#each [1, 2, 3, 4, 5, 6, 7, 8] as i}
						<div class="aspect-square rounded" style="background: var(--os-secondary); opacity: 0.5;"></div>
					{/each}
				</div>
			</div>
		{:else if pageType === 'search'}
			<!-- Search preview -->
			<div class="space-y-4" style="max-width: var(--os-max-width); margin: 0 auto;">
				<div class="flex gap-2">
					<div class="flex-1 h-10 rounded" style="background: var(--os-background); border: 1px solid var(--os-muted);"></div>
					<button class="px-4 rounded" style="background: var(--os-primary); color: white;">Search</button>
				</div>
				<p style="color: var(--os-muted);">Search across photos, albums, people...</p>
				<div class="grid grid-cols-4 gap-2">
					{#each [1, 2, 3, 4] as i}
						<div class="aspect-square rounded" style="background: var(--os-secondary); opacity: 0.4;"></div>
					{/each}
				</div>
			</div>
		{:else if pageType === 'header'}
			<!-- Header preview -->
			<div class="space-y-2" style="max-width: var(--os-max-width); margin: 0 auto;">
				<div class="h-12 rounded flex items-center gap-4 px-4" style="background: var(--os-primary); color: white;">
					<span class="w-8 h-8 rounded bg-white/20"></span>
					<span style="font-family: var(--os-font-heading);">Site Title</span>
					<span class="ml-auto text-sm opacity-80">Menu</span>
				</div>
			</div>
		{:else if pageType === 'footer'}
			<!-- Footer preview -->
			<div class="space-y-2" style="max-width: var(--os-max-width); margin: 0 auto;">
				<div class="h-16 rounded flex items-center justify-center gap-4 px-4" style="background: var(--os-secondary); color: white; opacity: 0.8;">
					<span style="font-family: var(--os-font-heading);">Footer</span>
					<span class="text-sm">© 2024</span>
				</div>
			</div>
		{:else}
			<!-- Page Builder preview -->
			<div class="space-y-4" style="max-width: var(--os-max-width); margin: 0 auto;">
				<div class="h-16 rounded flex items-center justify-center" style="background: var(--os-primary); color: white;">
					<span style="font-family: var(--os-font-heading);">Custom Page Hero</span>
				</div>
				<div class="prose max-w-none" style="color: var(--os-text);">
					<h2 style="font-family: var(--os-font-heading);">Rich Text Section</h2>
					<p style="color: var(--os-muted);">Sample paragraph text. Design tokens apply to Page Builder pages too.</p>
				</div>
				<button class="px-6 py-2 rounded" style="background: var(--os-accent); color: white;">Call to Action</button>
			</div>
		{/if}
	</div>
</div>
