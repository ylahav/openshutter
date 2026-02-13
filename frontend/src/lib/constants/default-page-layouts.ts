/**
 * Default page layouts and modules for each page type
 * Used when initializing new themes and for live preview
 */

export const DEFAULT_PAGE_LAYOUTS: Record<string, { gridRows: number; gridColumns: number }> = {
	home: { gridRows: 2, gridColumns: 1 },
	gallery: { gridRows: 1, gridColumns: 1 },
	album: { gridRows: 1, gridColumns: 1 },
	search: { gridRows: 1, gridColumns: 1 },
	header: { gridRows: 1, gridColumns: 5 },
	footer: { gridRows: 1, gridColumns: 1 }
};

export const DEFAULT_PAGE_MODULES: Record<string, any[]> = {
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
				albumSource: 'root'
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
				albumSource: 'root'
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
				albumSource: 'current'
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
			_id: 'mod_default_footer_text',
			type: 'richText',
			props: {
				title: {},
				body: { en: '<p>&copy; 2024 OpenShutter. All rights reserved.</p>' },
				background: 'gray'
			},
			rowOrder: 0,
			columnIndex: 0,
			rowSpan: 1,
			colSpan: 1
		}
	]
};
