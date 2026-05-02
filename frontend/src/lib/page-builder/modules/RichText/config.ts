// frontend/src/lib/page-builder/modules/RichText/config.ts
export const richTextConfig = {
	type: 'richText',
	label: 'Rich Text',
	description: 'Text block with optional title and HTML body.',
	fields: [
		{ key: 'title', type: 'multilangText', label: 'Title', required: false },
		{ key: 'body', type: 'multilangHTML', label: 'Body', required: false },
		{
			key: 'background',
			type: 'select',
			label: 'Background',
			options: [
				{ value: 'white', label: 'White (theme)' },
				{ value: 'gray', label: 'Gray (theme)' },
				{ value: 'transparent', label: 'Transparent' },
				{ value: 'custom', label: 'Custom color…' },
			],
			default: 'white',
			required: true,
		},
		{
			key: 'backgroundColor',
			type: 'string',
			label: 'Background color',
			required: false,
			placeholder: '#f5f5f5, rgb(0 0 0 / 0.1), hsl(220 20% 96%)',
			visibleWhen: { background: 'custom' },
			description: 'Any CSS color value applied when Background is “Custom”.',
		},
	],
} as const;
