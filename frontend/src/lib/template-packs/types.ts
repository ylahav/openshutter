// Intentionally loose constructor typing:
// - Svelte component constructor types differ between Svelte versions
// - We only need compatibility with <svelte:component this={...}>
export type SvelteComponentConstructor = new (...args: any[]) => any

export type TemplatePackName = string

export type TemplatePackPages = {
  Home: SvelteComponentConstructor
  Gallery: SvelteComponentConstructor
  Album: SvelteComponentConstructor
  About: SvelteComponentConstructor
  Search: SvelteComponentConstructor
  Contact: SvelteComponentConstructor
  CmsPage: SvelteComponentConstructor
  Login: SvelteComponentConstructor
}

export type TemplatePackComponents = {
  Hero?: SvelteComponentConstructor
  AlbumCard?: SvelteComponentConstructor
  AlbumList?: SvelteComponentConstructor
}

export type TemplatePack = {
  name: TemplatePackName
  pages: TemplatePackPages
  /** Optional shared parts (chrome uses `layoutShell` presets, not pack components). */
  components?: TemplatePackComponents
}

