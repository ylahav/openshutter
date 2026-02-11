// frontend/src/lib/page-builder/modules/Cta/config.ts
export const ctaConfig = {
	type: 'cta',
	label: 'Call To Action',
	description: 'Cta section with title, description and buttons.',
	fields: [
		{ key: 'title', type: 'multilangText', label: 'Title', required: false },
		{ key: 'description', type: 'multilangText', label: 'Description', required: false },
		{ key: 'primaryLabel', type: 'string', label: 'Primary button label', default: 'Get Started' },
		{ key: 'primaryHref', type: 'string', label: 'Primary button URL', default: '/' },
		{ key: 'secondaryLabel', type: 'string', label: 'Secondary button label', required: false },
		{ key: 'secondaryHref', type: 'string', label: 'Secondary button URL', required: false },
	],
} as const;
