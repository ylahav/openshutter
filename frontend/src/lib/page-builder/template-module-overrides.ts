import type { Component } from 'svelte';

export type PageBuilderModuleMap = Record<string, Component<any>>;

// Template-specific overrides for Page Builder modules.
//
// Convention:
// - A template pack may provide a module implementation under:
//   `src/templates/<pack>/components/page-builder/<ModuleName>.svelte`
// - ModuleName matches the entry key in PageRenderer’s module map (e.g. `HeroModule` for `hero`).
//
// This file uses static imports so Vite can bundle correctly.

import AtelierHeroModule from '$templates/atelier/components/page-builder/HeroModule.svelte';

export const TEMPLATE_PAGE_BUILDER_OVERRIDES: Record<string, Partial<PageBuilderModuleMap>> = {
	atelier: {
		hero: AtelierHeroModule
	}
};

