/**
 * Default page layouts and modules for each page type
 * Used when initializing new themes and for live preview
 */

export const DEFAULT_PAGE_LAYOUTS: Record<string, { gridRows: number; gridColumns: number }> = {
	home: { gridRows: 2, gridColumns: 1 },
	gallery: { gridRows: 1, gridColumns: 1 },
	album: { gridRows: 1, gridColumns: 1 },
	search: { gridRows: 1, gridColumns: 1 },
	login: { gridRows: 1, gridColumns: 1 },
	header: { gridRows: 1, gridColumns: 5 },
	footer: { gridRows: 2, gridColumns: 1 }
};

/** Default theme module row — props vary by `type` */
export type DefaultPageModule = {
	_id: string
	type: string
	props: Record<string, unknown>
	rowOrder: number
	columnIndex: number
	rowSpan: number
	colSpan: number
}

export const DEFAULT_PAGE_MODULES: Record<string, DefaultPageModule[]> = {
	home: [
		{
			_id: 'mod_default_home_hero',
			type: 'hero',
			props: {
				title: { en: 'Welcome to Our Gallery' },
				subtitle: { en: 'Discover amazing moments captured in time' },
				ctaLabel: { en: 'Explore Albums' },
				ctaUrl: '/albums',
				backgroundStyle: 'light'
			},
			rowOrder: 0,
			columnIndex: 0,
			rowSpan: 1,
			colSpan: 1
		},
		{
			_id: 'mod_default_home_albums',
			type: 'albumsGrid',
			props: {
				albumSource: 'root',
				className: 'albums'
			},
			rowOrder: 1,
			columnIndex: 0,
			rowSpan: 1,
			colSpan: 1
		}
	],
	gallery: [
		{
			_id: 'mod_default_gallery_albums',
			type: 'albumsGrid',
			props: {
				albumSource: 'root',
				className: 'albums'
			},
			rowOrder: 0,
			columnIndex: 0,
			rowSpan: 1,
			colSpan: 1
		}
	],
	album: [
		{
			_id: 'mod_default_album_gallery',
			type: 'albumsGrid',
			props: {
				albumSource: 'current',
				className: 'albums'
			},
			rowOrder: 0,
			columnIndex: 0,
			rowSpan: 1,
			colSpan: 1
		}
	],
	search: [
		{
			_id: 'mod_default_search_text',
			type: 'richText',
			props: {
				title: { en: 'Search Results' },
				body: { en: '<p>Use the search bar to find photos, albums, people, and locations.</p>' },
				background: 'white'
			},
			rowOrder: 0,
			columnIndex: 0,
			rowSpan: 1,
			colSpan: 1
		}
	],
	login: [
		{
			_id: 'mod_default_login_form',
			type: 'loginForm',
			props: {
				/** Pack-prefixed on the page (`login` → `s-login`, `n-login`, …) for template SCSS hooks. */
				class: 'login'
			},
			rowOrder: 0,
			columnIndex: 0,
			rowSpan: 1,
			colSpan: 1
		}
	],
	header: [
		{
			_id: 'mod_default_header_logo',
			type: 'logo',
			props: {
				showAsLink: true
			},
			rowOrder: 0,
			columnIndex: 0,
			rowSpan: 1,
			colSpan: 1
		},
		{
			_id: 'mod_default_header_title',
			type: 'siteTitle',
			props: {
				showAsLink: true
			},
			rowOrder: 0,
			columnIndex: 1,
			rowSpan: 1,
			colSpan: 1
		},
		{
			_id: 'mod_default_header_menu',
			type: 'menu',
			props: {},
			rowOrder: 0,
			columnIndex: 2,
			rowSpan: 1,
			colSpan: 1
		},
		{
			_id: 'mod_default_header_language',
			type: 'languageSelector',
			props: {
				showFlags: true,
				showNativeNames: true,
				compact: false
			},
			rowOrder: 0,
			columnIndex: 3,
			rowSpan: 1,
			colSpan: 1
		},
		{
			_id: 'mod_default_header_theme',
			type: 'themeToggle',
			props: {},
			rowOrder: 0,
			columnIndex: 4,
			rowSpan: 1,
			colSpan: 1
		}
	],
	footer: [
		{
			_id: 'mod_default_footer_social',
			type: 'socialMedia',
			props: {
				align: 'center',
				orientation: 'horizontal',
				iconSize: 'md',
				showLabels: false
			},
			rowOrder: 0,
			columnIndex: 0,
			rowSpan: 1,
			colSpan: 1
		},
		{
			_id: 'mod_default_footer_text',
			type: 'richText',
			props: {
				title: {},
				body: { en: '<p>&copy; {{productName}}. All rights reserved.</p>' },
				background: 'gray'
			},
			rowOrder: 1,
			columnIndex: 0,
			rowSpan: 1,
			colSpan: 1
		}
	]
};

// ---------------------------------------------------------------------------
// P3 — Breakpoint-aware defaults
// ---------------------------------------------------------------------------

/** Header modules for xs/sm viewports: logo (col 0), title (col 1), menu (col 2). */
export const HEADER_MODULES_XS: DefaultPageModule[] = [
	{ ...DEFAULT_PAGE_MODULES.header[0] },
	{ ...DEFAULT_PAGE_MODULES.header[1] },
	{ ...DEFAULT_PAGE_MODULES.header[2] }
];

/** Header modules for md viewports: 3-col + themeToggle (col 3). */
export const HEADER_MODULES_MD: DefaultPageModule[] = [
	{ ...DEFAULT_PAGE_MODULES.header[0] },
	{ ...DEFAULT_PAGE_MODULES.header[1] },
	{ ...DEFAULT_PAGE_MODULES.header[2] },
	{ ...DEFAULT_PAGE_MODULES.header[4], columnIndex: 3 }
];

/** Header modules for lg/xl viewports: full 5-col set. */
export const HEADER_MODULES_LG: DefaultPageModule[] = DEFAULT_PAGE_MODULES.header.map((m) => ({ ...m }));

/** Per-page grid defaults by breakpoint. Used as seed fallback when DB has no layout data. */
export const DEFAULT_PAGE_LAYOUT_BY_BP: Record<string, Record<string, { gridRows: number; gridColumns: number }>> = {
	home:    { xs: { gridRows: 2, gridColumns: 1 }, sm: { gridRows: 2, gridColumns: 1 }, md: { gridRows: 2, gridColumns: 1 }, lg: { gridRows: 2, gridColumns: 1 }, xl: { gridRows: 2, gridColumns: 1 } },
	gallery: { xs: { gridRows: 1, gridColumns: 1 }, sm: { gridRows: 1, gridColumns: 1 }, md: { gridRows: 1, gridColumns: 1 }, lg: { gridRows: 1, gridColumns: 1 }, xl: { gridRows: 1, gridColumns: 1 } },
	album:   { xs: { gridRows: 1, gridColumns: 1 }, sm: { gridRows: 1, gridColumns: 1 }, md: { gridRows: 1, gridColumns: 1 }, lg: { gridRows: 1, gridColumns: 1 }, xl: { gridRows: 1, gridColumns: 1 } },
	search:  { xs: { gridRows: 1, gridColumns: 1 }, sm: { gridRows: 1, gridColumns: 1 }, md: { gridRows: 1, gridColumns: 1 }, lg: { gridRows: 1, gridColumns: 1 }, xl: { gridRows: 1, gridColumns: 1 } },
	login:   { xs: { gridRows: 1, gridColumns: 1 }, sm: { gridRows: 1, gridColumns: 1 }, md: { gridRows: 1, gridColumns: 1 }, lg: { gridRows: 1, gridColumns: 1 }, xl: { gridRows: 1, gridColumns: 1 } },
	header:  { xs: { gridRows: 1, gridColumns: 3 }, sm: { gridRows: 1, gridColumns: 3 }, md: { gridRows: 1, gridColumns: 4 }, lg: { gridRows: 1, gridColumns: 5 }, xl: { gridRows: 1, gridColumns: 5 } },
	footer:  { xs: { gridRows: 2, gridColumns: 1 }, sm: { gridRows: 2, gridColumns: 1 }, md: { gridRows: 2, gridColumns: 1 }, lg: { gridRows: 2, gridColumns: 1 }, xl: { gridRows: 2, gridColumns: 1 } }
};

/** Canonical per-page module defaults in `PageModulesResponsiveEntry` format. */
export const DEFAULT_PAGE_MODULE_BY_BP: Record<string, {
	activeBreakpoints: boolean;
	modules?: DefaultPageModule[];
	breakpoints?: Record<string, DefaultPageModule[]>;
}> = {
	home:    { activeBreakpoints: false, modules: DEFAULT_PAGE_MODULES.home },
	gallery: { activeBreakpoints: false, modules: DEFAULT_PAGE_MODULES.gallery },
	album:   { activeBreakpoints: false, modules: DEFAULT_PAGE_MODULES.album },
	search:  { activeBreakpoints: false, modules: DEFAULT_PAGE_MODULES.search },
	login:   { activeBreakpoints: false, modules: DEFAULT_PAGE_MODULES.login },
	header:  {
		activeBreakpoints: true,
		breakpoints: {
			xs: HEADER_MODULES_XS,
			sm: HEADER_MODULES_XS,
			md: HEADER_MODULES_MD,
			lg: HEADER_MODULES_LG,
			xl: HEADER_MODULES_LG
		}
	},
	footer:  { activeBreakpoints: false, modules: DEFAULT_PAGE_MODULES.footer }
};
