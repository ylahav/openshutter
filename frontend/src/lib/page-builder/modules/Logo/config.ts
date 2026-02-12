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
	],
} as const;
