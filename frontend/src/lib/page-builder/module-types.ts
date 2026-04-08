/**
 * Module types supported by PageRenderer - shared with theme overrides and template builder.
 * Keep in sync with:
 * - frontend/src/lib/page-builder/PageRenderer.svelte (moduleMap)
 * - frontend/src/routes/admin/templates/overrides/+page.svelte (picker filter arrays)
 */
export const PAGE_MODULE_TYPES = [
	{ type: 'layoutShell', label: 'Layout region (named grid)' },
	{ type: 'pageTitle', label: 'Page title' },
	{ type: 'hero', label: 'Hero' },
	{ type: 'richText', label: 'Rich Text' },
	{ type: 'featureGrid', label: 'Feature Grid' },
	{ type: 'albumsGrid', label: 'Albums Grid' },
	{ type: 'albumView', label: 'Album view' },
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
