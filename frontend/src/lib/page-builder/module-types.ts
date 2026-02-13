/** Module types supported by PageRenderer - shared with theme overrides and template builder */
export const PAGE_MODULE_TYPES = [
	{ type: 'hero', label: 'Hero' },
	{ type: 'richText', label: 'Rich Text' },
	{ type: 'featureGrid', label: 'Feature Grid' },
	{ type: 'albumsGrid', label: 'Albums Grid' },
	{ type: 'albumGallery', label: 'Album Gallery' },
	{ type: 'cta', label: 'Call to Action' },
	{ type: 'logo', label: 'Logo' },
	{ type: 'siteTitle', label: 'Site Title' },
	{ type: 'menu', label: 'Menu' },
	{ type: 'languageSelector', label: 'Language Selector' },
	{ type: 'themeToggle', label: 'Theme Toggle' },
	{ type: 'userGreeting', label: 'User Greeting' },
	{ type: 'authButtons', label: 'Auth Buttons' },
	{ type: 'socialMedia', label: 'Social Media' }
] as const;

export type PageModuleType = (typeof PAGE_MODULE_TYPES)[number]['type'];
