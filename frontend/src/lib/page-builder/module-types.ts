/**
 * Module types supported by PageRenderer - shared with theme overrides and template builder.
 * Keep in sync with:
 * - frontend/src/lib/page-builder/PageRenderer.svelte (moduleMap)
 * - frontend/src/routes/admin/templates/overrides/+page.svelte (picker filter arrays)
 *
 * Per-module docs (purpose, props, CSS hooks): frontend/src/lib/page-builder/modules/README.md
 */
export const PAGE_MODULE_TYPES = [
	{ type: 'layoutShell', label: 'Layout region (named grid)' },
	{ type: 'pageTitle', label: 'Page title' },
	{ type: 'loginForm', label: 'Login Form' },
	{ type: 'searchBar', label: 'Search Bar' },
	{ type: 'searchFilter', label: 'Search Filter' },
	{ type: 'searchForm', label: 'Search Form' },
	{ type: 'searchResults', label: 'Search Results' },
	{ type: 'hero', label: 'Hero' },
	{ type: 'richText', label: 'Rich Text' },
	{ type: 'divider', label: 'Horizontal line' },
	{ type: 'featureGrid', label: 'Feature Grid' },
	{ type: 'albumsGrid', label: 'Albums Grid' },
	{ type: 'rootAlbumsList', label: 'Root Albums List' },
	{ type: 'albumView', label: 'Album View (albumView)' },
	{ type: 'cta', label: 'Call to Action' },
	{ type: 'blogCategory', label: 'Blog categories' },
	{ type: 'blogArticle', label: 'Blog articles' },
	{ type: 'logo', label: 'Logo' },
	{ type: 'siteTitle', label: 'Site Title' },
	{ type: 'menu', label: 'Menu' },
	{ type: 'languageSelector', label: 'Language Selector' },
	{ type: 'themeToggle', label: 'Theme Toggle' },
	{ type: 'themeSelect', label: 'Theme Select' },
	{ type: 'userGreeting', label: 'User Greeting' },
	{ type: 'authButtons', label: 'Auth Buttons' },
	{ type: 'socialMedia', label: 'Social Media' }
] as const;

export type PageModuleType = (typeof PAGE_MODULE_TYPES)[number]['type'];
