import type { PageData } from '$lib/types/page-builder';

/**
 * Album tile / list row shape used by gallery templates in albums mode.
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
