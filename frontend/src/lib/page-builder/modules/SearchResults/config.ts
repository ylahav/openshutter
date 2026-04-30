export const searchResultsConfig = {
	type: 'searchResults',
	label: 'Search Results',
	description: 'Results grid/list module connected to the search form module state.',
	fields: [
		{
			key: 'limit',
			type: 'string',
			label: 'Results per page',
			required: false,
			placeholder: '20',
			description: 'How many photos to fetch per page. Default is 20.'
		},
		{
			key: 'showSearchSummary',
			type: 'boolean',
			label: 'Show query summary above results',
			default: true
		}
	]
} as const;
