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
	{ type: 'menu', label: 'Menu' }
] as const;

export type PageModuleType = (typeof PAGE_MODULE_TYPES)[number]['type'];
