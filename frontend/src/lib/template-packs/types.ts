// Intentionally loose constructor typing:
// - Svelte component constructor types differ between Svelte versions
// - We only need compatibility with <svelte:component this={...}>
export type SvelteComponentConstructor = new (...args: any[]) => any

export type TemplatePackName = string

export type TemplatePackPages = {
  Home: SvelteComponentConstructor
  Gallery: SvelteComponentConstructor
  Album: SvelteComponentConstructor
  Login: SvelteComponentConstructor
}

export type TemplatePackComponents = {
  Header?: SvelteComponentConstructor
  Footer?: SvelteComponentConstructor
  Hero?: SvelteComponentConstructor
  AlbumCard?: SvelteComponentConstructor
  AlbumList?: SvelteComponentConstructor
}

export type TemplatePack = {
  name: TemplatePackName
  pages: TemplatePackPages
  components?: TemplatePackComponents
}

