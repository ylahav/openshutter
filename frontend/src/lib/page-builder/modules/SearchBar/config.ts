export const searchBarConfig = {
	type: 'searchBar',
	label: 'Search Bar',
	description: 'Primitive search input module.',
	fields: [
		{
			key: 'placeholder',
			type: 'string',
			label: 'Search placeholder',
			required: false,
			placeholder: 'Search photos and albums...'
		}
	]
} as const;
