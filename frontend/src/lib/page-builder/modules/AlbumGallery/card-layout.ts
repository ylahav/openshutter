import type { TemplatePackId } from '$lib/template/packs/ids';

/** Album card visual presets (internal + legacy names). */
export const ALBUM_CARD_VARIANTS = [
	'bareSquare',
	'roundedCard',
	'editorialList',
	'portraitGrid',
	'permanentOverlay',
	'compactList',
] as const;
export type AlbumCardVisualVariant = (typeof ALBUM_CARD_VARIANTS)[number];

/** Normalized keys (lowercase) → canonical variant. */
const ALBUM_CARD_ALIASES: Record<string, AlbumCardVisualVariant> = {
	// Spec (card layout doc)
	bare: 'bareSquare',
	cards: 'roundedCard',
	list: 'editorialList',
	portrait: 'portraitGrid',
	overlay: 'permanentOverlay',
	compact: 'compactList',
	// Legacy internal (lowercased lookup)
	baresquare: 'bareSquare',
	roundedcard: 'roundedCard',
	editoriallist: 'editorialList',
	portraitgrid: 'portraitGrid',
	permanentoverlay: 'permanentOverlay',
	compactlist: 'compactList',
};

/** Photo grid presets — internal + legacy. */
export const PHOTO_GRID_VARIANTS = [
	'default',
	'squareTight',
	'landscape43',
	'portrait34',
	'masonry',
	'justifiedRows',
	'largePreview',
] as const;
export type PhotoGridVisualVariant = (typeof PHOTO_GRID_VARIANTS)[number];

const PHOTO_GRID_ALIASES: Record<string, PhotoGridVisualVariant> = {
	// Spec (lowercase keys)
	'square-tight': 'squareTight',
	squaretight: 'squareTight',
	landscape: 'landscape43',
	portrait: 'portrait34',
	masonry: 'masonry',
	justified: 'justifiedRows',
	'large-preview': 'largePreview',
	largepreview: 'largePreview',
	// Legacy internal
	default: 'default',
	landscape43: 'landscape43',
	portrait34: 'portrait34',
	justifiedrows: 'justifiedRows',
};

export function parseAlbumCardVariant(raw: unknown): AlbumCardVisualVariant | null {
	if (typeof raw !== 'string') return null;
	const key = raw.trim();
	if (!key || key.toLowerCase() === 'auto') return null;
	const mapped = ALBUM_CARD_ALIASES[key.toLowerCase()];
	if (mapped) return mapped;
	return (ALBUM_CARD_VARIANTS as readonly string[]).includes(key) ? (key as AlbumCardVisualVariant) : null;
}

export function parsePhotoGridVariant(raw: unknown): PhotoGridVisualVariant | null {
	if (typeof raw !== 'string') return null;
	const key = raw.trim();
	if (!key || key.toLowerCase() === 'auto') return null;
	const lower = key.toLowerCase();
	const mapped = PHOTO_GRID_ALIASES[lower] ?? PHOTO_GRID_ALIASES[key];
	if (mapped) return mapped;
	return (PHOTO_GRID_VARIANTS as readonly string[]).includes(key) ? (key as PhotoGridVisualVariant) : null;
}

/**
 * Module props win, then theme `template.albumCard`, then infer from pack + albums grid + row/stack.
 */
export function resolveAlbumCardVariant(
	moduleVariant: unknown,
	themeVariant: unknown,
	packId: TemplatePackId,
	noirAlbumGrid: boolean,
	albumCardLayout: 'stack' | 'row'
): AlbumCardVisualVariant {
	const explicit = parseAlbumCardVariant(moduleVariant) ?? parseAlbumCardVariant(themeVariant);
	if (explicit) return explicit;
	if (noirAlbumGrid && albumCardLayout === 'stack') return 'bareSquare';
	if (albumCardLayout === 'row') return 'editorialList';
	if (packId === 'atelier') return 'editorialList';
	if (packId === 'studio') return 'roundedCard';
	return 'roundedCard';
}

/** Module props win, then theme `template.photoCard`, then pack defaults. */
export function resolvePhotoGridVariant(
	moduleVariant: unknown,
	themeVariant: unknown,
	packId: TemplatePackId
): PhotoGridVisualVariant {
	const explicit = parsePhotoGridVariant(moduleVariant) ?? parsePhotoGridVariant(themeVariant);
	if (explicit) return explicit;
	if (packId === 'noir') return 'squareTight';
	if (packId === 'atelier') return 'portrait34';
	if (packId === 'studio') return 'landscape43';
	return 'default';
}

/** How `PhotoCard` should render for a grid preset. */
export function photoCardPresentation(grid: PhotoGridVisualVariant): 'full' | 'tile' | 'masonry' {
	if (grid === 'masonry') return 'masonry';
	if (
		grid === 'squareTight' ||
		grid === 'justifiedRows' ||
		grid === 'landscape43' ||
		grid === 'portrait34'
	) {
		return 'tile';
	}
	return 'full';
}
