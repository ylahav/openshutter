export const searchFormConfig = {
	type: 'searchForm',
	label: 'Search Form',
	description: 'Search input + optional filters trigger for search pages.',
	fields: [
		{
			key: 'placeholder',
			type: 'string',
			label: 'Search placeholder',
			required: false,
			placeholder: 'Search photos and albums...'
		},
		{
			key: 'showFiltersButton',
			type: 'boolean',
			label: 'Show filters button',
			default: true
		},
		{
			key: 'filterWrapClass',
			type: 'string',
			label: 'Filter row wrapper class',
			required: false,
			placeholder: 'e.g. max-w-4xl mx-auto'
		}
	]
} as const;
