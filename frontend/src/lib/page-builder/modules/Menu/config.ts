export const menuConfig = {
	type: 'menu',
	label: 'Menu',
	description: 'Navigation menu.',
	fields: [
		{
			key: 'orientation',
			type: 'select',
			label: 'Orientation',
			options: ['horizontal', 'vertical'],
			default: 'horizontal',
		},
	],
} as const;
