export const siteTitleConfig = {
	type: 'siteTitle',
	label: 'Site Title',
	description: 'Site name/title from site config.',
	fields: [
		{
			key: 'showAsLink',
			type: 'boolean',
			label: 'Link to home',
			default: true,
		},
	],
} as const;
