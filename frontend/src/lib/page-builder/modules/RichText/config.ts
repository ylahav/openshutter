// frontend/src/lib/page-builder/modules/RichText/config.ts
export const richTextConfig = {
	type: 'richText',
	label: 'Rich Text',
	description: 'Text block with optional title and HTML body.',
	fields: [
		{ key: 'title', type: 'multilangText', label: 'Title', required: false },
		{ key: 'body', type: 'multilangHTML', label: 'Body', required: false },
		{ key: 'background', type: 'select', label: 'Background', options: ['white', 'gray'], default: 'white' },
	],
} as const;
