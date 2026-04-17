import type { PageData } from '$lib/types/page-builder';

/**
 * Props contract for pack **Home** pages (`Home.svelte`).
 * Packs load their own data (e.g. albums); no route `data` is required today.
 * `Record<string, any>` satisfies Svelte `Component<Props>`’s constraint; there are no real props yet.
 */
export type PackHomePageProps = Record<string, any>;

/**
 * Album tile / list row shape passed into gallery **albums** mode (API-shaped objects).
 * Kept structural so packs can narrow internally.
 */
export interface PackGalleryAlbumListItem {
	_id?: string;
	alias?: string;
	name?: unknown;
	title?: unknown;
	description?: unknown;
	coverImage?: unknown;
	photoCount?: number;
	isFeatured?: boolean;
	[key: string]: unknown;
}

export interface PackGalleryPageProps {
	mode: 'photos' | 'albums';
	albums: PackGalleryAlbumListItem[];
	loading: boolean;
	error: string | null;
}

/** Pack **Album** view loads from `$page` + API; no parent props (constraint only). */
export type PackAlbumPageProps = Record<string, any>;

export interface PackAboutPageProps {
	page: PageData | null;
}

export interface PackContactPageProps {
	page: PageData | null;
}

export interface PackSearchPageProps {
	initialQuery?: string;
	variant?: 'noir' | 'default';
}

export interface PackCmsPageProps {
	page: PageData | null;
	error?: string | null;
}

export type PackLoginPageProps = Record<string, any>;
