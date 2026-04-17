import type { Component } from 'svelte';
import type {
	PackAboutPageProps,
	PackAlbumPageProps,
	PackCmsPageProps,
	PackContactPageProps,
	PackGalleryPageProps,
	PackHomePageProps,
	PackLoginPageProps,
	PackSearchPageProps
} from './pack-page-props';

export type TemplatePackName = string;

export type TemplatePackPages = {
	Home: Component<PackHomePageProps>;
	Gallery: Component<PackGalleryPageProps>;
	Album: Component<PackAlbumPageProps>;
	About: Component<PackAboutPageProps>;
	Search: Component<PackSearchPageProps>;
	Contact: Component<PackContactPageProps>;
	CmsPage: Component<PackCmsPageProps>;
	Login: Component<PackLoginPageProps>;
};

/** @deprecated Prefer `TemplatePackPages` + `Component` from `./pack-page-props`. */
export type SvelteComponentConstructor = new (...args: any[]) => any;

export type TemplatePackComponents = {
	Hero?: SvelteComponentConstructor;
	AlbumCard?: SvelteComponentConstructor;
	AlbumList?: SvelteComponentConstructor;
};

export type TemplatePack = {
	name: TemplatePackName;
	pages: TemplatePackPages;
	/** Optional shared parts (chrome uses `layoutShell` presets, not pack components). */
	components?: TemplatePackComponents;
};
