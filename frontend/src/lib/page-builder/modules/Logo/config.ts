export const logoConfig = {
	type: 'logo',
	label: 'Logo',
	description: 'Site logo image from site config.',
	fields: [
		{
			key: 'size',
			type: 'select',
			label: 'Size',
			options: ['sm', 'md', 'lg'],
			default: 'md',
		},
		{
			key: 'fallbackIcon',
			type: 'boolean',
			label: 'Show icon when no logo',
			default: true,
		},
		{
			key: 'showSiteTitle',
			type: 'boolean',
			label: 'Show site title',
			default: false,
		},
		{
			key: 'titlePosition',
			type: 'select',
			label: 'Title position',
			options: ['above', 'below', 'right', 'left'],
			default: 'right',
		},
	],
} as const;
