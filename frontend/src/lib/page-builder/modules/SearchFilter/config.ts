export const searchFilterConfig = {
	type: 'searchFilter',
	label: 'Search Filter',
	description: 'Primitive filter trigger + active filter chips module.',
	fields: [
		{
			key: 'showFiltersButton',
			type: 'boolean',
			label: 'Show filters button',
			default: true
		},
		{
			key: 'buttonClass',
			type: 'string',
			label: 'Filter button class',
			required: false,
			placeholder: 'e.g. mt-2'
		},
		{
			key: 'chipsWrapClass',
			type: 'string',
			label: 'Filter chips wrapper class',
			required: false,
			placeholder: 'e.g. max-w-4xl mx-auto'
		}
	]
} as const;
