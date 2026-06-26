// frontend/src/lib/page-builder/modules/Photo/config.ts
export const photoConfig = {
	type: 'photo',
	label: 'Photo',
	description:
		'A single image with optional caption, credit, link and sizing. Upload directly or paste an existing URL — e.g. /api/storage/serve/local/<path> for an album photo.',
	fields: [
		{
			key: 'src',
			type: 'image',
			uploadSiteAsset: true,
			label: 'Image URL',
			required: true,
			placeholder: 'https://… or /api/storage/serve/local/…',
			description: 'Upload an image or paste a URL. Photos already in the gallery can be referenced by their public serve URL.'
		},
		{
			key: 'alt',
			type: 'multilangText',
			label: 'Alt text (accessibility)',
			required: false,
			description: 'Falls back to the caption if blank.'
		},
		{
			key: 'caption',
			type: 'multilangText',
			label: 'Caption',
			required: false
		},
		{
			key: 'credit',
			type: 'multilangText',
			label: 'Credit / attribution',
			required: false
		},
		{
			key: 'href',
			type: 'string',
			label: 'Link URL',
			required: false,
			placeholder: 'https://… (leave blank for no link)'
		},
		{
			key: 'target',
			type: 'select',
			label: 'Link target',
			required: false,
			default: '_self',
			options: [
				{ value: '_self', label: 'Same tab' },
				{ value: '_blank', label: 'New tab' }
			],
			visibleWhen: undefined
		},
		{
			key: 'aspect',
			type: 'select',
			label: 'Aspect ratio',
			required: false,
			default: 'auto',
			options: [
				{ value: 'auto', label: 'Natural (intrinsic)' },
				{ value: 'square', label: '1:1 Square' },
				{ value: 'video', label: '16:9 Video' },
				{ value: '4/3', label: '4:3' },
				{ value: '3/2', label: '3:2' },
				{ value: '21/9', label: '21:9 Ultrawide' }
			]
		},
		{
			key: 'fit',
			type: 'select',
			label: 'Image fit (when aspect is fixed)',
			required: false,
			default: 'cover',
			options: [
				{ value: 'cover', label: 'Cover (crop to fit)' },
				{ value: 'contain', label: 'Contain (letterbox)' }
			]
		},
		{
			key: 'rounded',
			type: 'select',
			label: 'Corner rounding',
			required: false,
			default: 'none',
			options: [
				{ value: 'none', label: 'None' },
				{ value: 'sm', label: 'Small' },
				{ value: 'md', label: 'Medium' },
				{ value: 'lg', label: 'Large' },
				{ value: 'full', label: 'Full (circle)' }
			]
		},
		{
			key: 'align',
			type: 'select',
			label: 'Block alignment',
			required: false,
			default: 'center',
			options: [
				{ value: 'left', label: 'Left' },
				{ value: 'center', label: 'Center' },
				{ value: 'right', label: 'Right' }
			]
		},
		{
			key: 'maxWidth',
			type: 'string',
			label: 'Max width (CSS, e.g. 600px or 40rem)',
			required: false,
			placeholder: 'leave blank for full container width'
		},
		{
			key: 'captionAlign',
			type: 'select',
			label: 'Caption alignment',
			required: false,
			default: 'center',
			options: [
				{ value: 'left', label: 'Left' },
				{ value: 'center', label: 'Center' },
				{ value: 'right', label: 'Right' }
			]
		}
	]
} as const;
