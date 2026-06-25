export const menuConfig = {
	type: 'menu',
	label: 'Menu',
	description: 'Navigation menu.',
	fields: [
		{
			key: 'instanceRef',
			type: 'menuInstance',
			label: 'Menu to render',
			description:
				'Pick a named menu from Site config → Navigation. Leave blank to fall back to the legacy default menu.',
		},
		{
			key: 'orientation',
			type: 'select',
			label: 'Orientation',
			options: ['horizontal', 'vertical'],
			default: 'horizontal',
			description: 'Overrides the named menu’s own orientation when set.',
		},
	],
} as const;
