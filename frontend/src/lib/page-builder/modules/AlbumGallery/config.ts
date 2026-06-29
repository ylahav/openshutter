// frontend/src/lib/page-builder/modules/AlbumGallery/config.ts

/**
 * Field metadata is read by `ModulePropsForm.svelte`. Two visibility hooks are
 * supported: the legacy `visibleWhen: { key: value }` (single-key equality) and
 * the predicate-style `showIf: (props) => boolean` used here for multi-key /
 * inverse conditions. The form hides a group entirely when all its fields are
 * hidden, so showIf cascades to the whole section.
 */
type AlbumGalleryProps = Record<string, unknown>;
const has = (p: AlbumGalleryProps, k: string) => Object.prototype.hasOwnProperty.call(p, k);
const valueOr = (p: AlbumGalleryProps, k: string, fallback: unknown) =>
	has(p, k) ? p[k] : fallback;

const isCurrentAlbum = (p: AlbumGalleryProps) => valueOr(p, 'albumSource', 'root') === 'current';
const isSelectedAlbums = (p: AlbumGalleryProps) => valueOr(p, 'albumSource', 'root') === 'selected';
const showsAlbumCards = (p: AlbumGalleryProps) => valueOr(p, 'cardDataType', 'both') !== 'photos';
const showsPhotoCards = (p: AlbumGalleryProps) =>
	valueOr(p, 'cardDataType', 'both') !== 'subAlbums';
const showsBoth = (p: AlbumGalleryProps) => valueOr(p, 'cardDataType', 'both') === 'both';

export const albumGalleryConfig = {
	type: 'albumView',
	label: 'Album view',
	description: 'Album page cards for sub-albums, photos, or both.',
	groups: [
		{ id: 'content', label: 'Header (this module)' },
		{ id: 'source', label: 'Data source & sorting' },
		{ id: 'display', label: 'Display & ordering' },
		{ id: 'albumPage', label: 'Album page header (current album)' },
		{ id: 'albumCards', label: 'Album cards' },
		{ id: 'photoCards', label: 'Photo cards' },
		{ id: 'styling', label: 'Styling' },
		{ id: 'advanced', label: 'Advanced / Legacy', defaultCollapsed: true },
	],
	fields: [
		// ── Header (module-level intro above the grid)
		{ key: 'title', type: 'multilangText', label: 'Title', required: false, group: 'content' },
		{ key: 'description', type: 'multilangHTML', label: 'Description', required: false, group: 'content' },

		// ── Data source
		{
			key: 'albumSource',
			type: 'select',
			label: 'Albums source',
			options: ['root', 'featured', 'selected', 'current'],
			default: 'root',
			group: 'source',
		},
		{
			key: 'selectedAlbums',
			type: 'albumPicker',
			label: 'Selected albums',
			required: false,
			group: 'source',
			showIf: isSelectedAlbums,
		},
		{
			key: 'sortBy',
			type: 'select',
			label: 'Sort by',
			options: ['manual', 'order', 'name', 'photoCount', 'createdAt', 'lastPhotoDate'],
			default: 'manual',
			group: 'source',
		},
		{
			key: 'sortDirection',
			type: 'select',
			label: 'Sort direction',
			options: ['asc', 'desc'],
			default: 'asc',
			group: 'source',
			showIf: (p: AlbumGalleryProps) => valueOr(p, 'sortBy', 'manual') !== 'manual',
		},
		{
			key: 'limit',
			type: 'number',
			label: 'Maximum items',
			default: 12,
			description:
				'For album listing grids (root/featured/selected). On an album page (current album), all loaded photos are shown with “Load more”.',
			group: 'source',
			showIf: (p: AlbumGalleryProps) => !isCurrentAlbum(p),
		},

		// ── Display & ordering (mix of albums and photos)
		{
			key: 'cardDataType',
			type: 'select',
			label: 'Card data type',
			options: ['subAlbums', 'photos', 'both'],
			default: 'both',
			group: 'display',
		},
		{
			key: 'mixedDisplayMode',
			type: 'select',
			label: 'Mixed display mode',
			options: ['grouped', 'interleaved'],
			default: 'grouped',
			group: 'display',
			showIf: showsBoth,
		},
		{
			key: 'showSectionLabels',
			type: 'boolean',
			label: 'Show section labels',
			default: true,
			group: 'display',
			showIf: showsBoth,
		},
		{
			key: 'showHeading',
			type: 'boolean',
			label: 'Show grid section heading',
			default: true,
			description:
				'When false, hides labels such as "Sub-albums" above the grid. Overrides section label visibility when set.',
			group: 'display',
			showIf: showsBoth,
		},

		// ── Album page header (only when albumSource is 'current')
		{
			key: 'showAlbumPageTitle',
			type: 'boolean',
			label: 'Show album page title',
			default: true,
			group: 'albumPage',
			showIf: isCurrentAlbum,
		},
		{
			key: 'showAlbumPageDescription',
			type: 'boolean',
			label: 'Show album page description',
			default: true,
			group: 'albumPage',
			showIf: isCurrentAlbum,
		},
		{
			key: 'showAlbumPageStats',
			type: 'boolean',
			label: 'Show album page stats',
			default: true,
			group: 'albumPage',
			showIf: isCurrentAlbum,
		},
		{
			key: 'showAlbumHero',
			type: 'boolean',
			label: 'Show album hero section',
			default: false,
			group: 'albumPage',
			showIf: isCurrentAlbum,
		},
		{
			key: 'albumHeaderFieldOrder',
			type: 'list',
			label: 'Album header field order',
			default: ['albumTitle', 'albumDescription', 'albumStats'],
			group: 'albumPage',
			showIf: isCurrentAlbum,
		},

		// ── Album cards
		{
			key: 'showAlbumTitle',
			type: 'boolean',
			label: 'Show album title',
			default: true,
			group: 'albumCards',
			showIf: showsAlbumCards,
		},
		{
			key: 'showAlbumDescription',
			type: 'boolean',
			label: 'Show album description',
			default: true,
			group: 'albumCards',
			showIf: showsAlbumCards,
		},
		{
			key: 'showAlbumFeaturedBadge',
			type: 'boolean',
			label: 'Show album featured badge',
			default: true,
			group: 'albumCards',
			showIf: showsAlbumCards,
		},
		{
			key: 'showPhotoCount',
			type: 'boolean',
			label: 'Show photo count',
			default: true,
			group: 'albumCards',
			showIf: showsAlbumCards,
		},
		{
			key: 'albumCard',
			type: 'select',
			label: 'Album card style',
			options: ['auto', 'bare', 'cards', 'list', 'portrait', 'overlay', 'compact'],
			default: 'auto',
			description:
				'Theme tokens: bare (Noir), cards (Studio), list (Atelier), portrait, overlay, compact. Auto uses pack + layout.',
			group: 'albumCards',
			showIf: showsAlbumCards,
		},
		{
			key: 'albumCardLayout',
			type: 'select',
			label: 'Album card layout',
			options: ['stack', 'row'],
			default: 'stack',
			description: 'Stack: image on top. Row: thumbnail left, details right (one album per row).',
			group: 'albumCards',
			showIf: showsAlbumCards,
		},
		{
			key: 'albumCardFieldOrder',
			type: 'list',
			label: 'Album card field order',
			default: ['cover', 'title', 'description', 'photoCount', 'featuredBadge'],
			group: 'albumCards',
			showIf: showsAlbumCards,
		},

		// ── Photo cards
		{
			key: 'showPhotoTitle',
			type: 'boolean',
			label: 'Show photo title',
			default: true,
			group: 'photoCards',
			showIf: showsPhotoCards,
		},
		{
			key: 'showPhotoDescription',
			type: 'boolean',
			label: 'Show photo description',
			default: true,
			group: 'photoCards',
			showIf: showsPhotoCards,
		},
		{
			key: 'showPhotoFeaturedBadge',
			type: 'boolean',
			label: 'Show photo featured badge',
			default: true,
			group: 'photoCards',
			showIf: showsPhotoCards,
		},
		{
			key: 'photoCard',
			type: 'select',
			label: 'Photo grid style',
			options: [
				'auto',
				'default',
				'square-tight',
				'landscape',
				'portrait',
				'masonry',
				'justified',
				'large-preview',
			],
			default: 'auto',
			description:
				'Theme tokens: square-tight (Noir), landscape (Studio), portrait (Atelier). Justified uses row layout + JS. Auto uses pack default.',
			group: 'photoCards',
			showIf: showsPhotoCards,
		},
		{
			key: 'photoCardFieldOrder',
			type: 'list',
			label: 'Photo card field order',
			default: ['cover', 'title', 'description', 'featuredBadge'],
			group: 'photoCards',
			showIf: showsPhotoCards,
		},

		// ── Styling
		{
			key: 'showCover',
			type: 'boolean',
			label: 'Show cover image',
			default: true,
			group: 'styling',
		},
		{
			key: 'coverAspect',
			type: 'select',
			label: 'Cover aspect',
			options: ['video', 'square', 'portrait'],
			default: 'video',
			group: 'styling',
		},
		{
			key: 'descriptionLines',
			type: 'number',
			label: 'Description lines',
			default: 2,
			group: 'styling',
		},
		{
			key: 'className',
			type: 'string',
			label: 'Cell CSS classes',
			required: false,
			description:
				'Optional classes on the page-builder cell (e.g. albums). The active template pack adds a short prefix per token (Studio: s-).',
			group: 'styling',
		},

		// ── Advanced / Legacy (collapsed by default)
		{
			key: 'showTitle',
			type: 'boolean',
			label: 'Show title (legacy/global)',
			default: true,
			description: 'Fallback for both album and photo card titles when per-type toggles are unset.',
			group: 'advanced',
		},
		{
			key: 'showDescription',
			type: 'boolean',
			label: 'Show description (legacy/global)',
			default: true,
			description:
				'Fallback for both album and photo card descriptions when per-type toggles are unset.',
			group: 'advanced',
		},
		{
			key: 'showFeaturedBadge',
			type: 'boolean',
			label: 'Show featured badge (legacy/global)',
			default: true,
			description: 'Fallback for both album and photo featured badges.',
			group: 'advanced',
		},
		{
			key: 'cardFieldOrder',
			type: 'list',
			label: 'Card field order (legacy/global)',
			default: ['cover', 'title', 'description', 'photoCount', 'featuredBadge'],
			description: 'Used as a fallback when the per-type field-order lists are unset.',
			group: 'advanced',
		},
	],
} as const;
