// frontend/src/lib/page-builder/modules/Hero/config.ts
export const heroConfig = {
	type: 'hero',
	label: 'Hero',
	description:
		'Background image with optional text and optional photo strip (gallery leading or your URLs).',
	fields: [
		{
			key: 'title',
			type: 'multilangText',
			label: 'Title',
			required: false
		},
		{
			key: 'subtitle',
			type: 'multilangText',
			label: 'Subtitle',
			required: false
		},
		{
			key: 'description',
			type: 'multilangText',
			label: 'Description',
			required: false,
			description: 'Optional longer line under the subtitle.'
		},
		{
			key: 'buttonLabel',
			type: 'multilangText',
			label: 'Primary button label',
			required: false
		},
		{
			key: 'buttonUrl',
			type: 'string',
			label: 'Primary button URL',
			required: false,
			placeholder: 'https://…'
		},
		{
			key: 'button2Label',
			type: 'multilangText',
			label: 'Secondary button label',
			required: false
		},
		{
			key: 'button2Url',
			type: 'string',
			label: 'Secondary button URL',
			required: false,
			placeholder: 'https://…'
		},
		{
			key: 'backgroundImage',
			type: 'image',
			uploadSiteAsset: true,
			label: 'Background image',
			required: false,
			placeholder: 'https://…',
			description: 'Full-width image behind the hero (URL or upload).'
		},
		{
			key: 'contentMediaOrder',
			type: 'select',
			label: 'Content vs photos',
			required: false,
			default: 'content-first',
			options: [
				{ value: 'content-first', label: 'Text first, then photos (row)' },
				{ value: 'media-first', label: 'Photos first, then text (row)' },
				{ value: 'stacked', label: 'Stacked (photos under text)' },
				{ value: 'content-only', label: 'Text only (hide photo strip)' },
				{ value: 'media-only', label: 'Photos only (hide text)' }
			]
		},
		{
			key: 'mediaMaxCount',
			type: 'string',
			label: 'Max photos in strip',
			required: false,
			placeholder: '4',
			description: '1–12. Ignored when photo strip is hidden.'
		},
		{
			key: 'mediaSource',
			type: 'select',
			label: 'Photo strip source',
			required: false,
			default: 'galleryLeading',
			options: [
				{ value: 'galleryLeading', label: 'Gallery-leading photos' },
				{ value: 'uploads', label: 'My image URLs (below)' }
			]
		},
		{
			key: 'mediaImages',
			type: 'string',
			label: 'Photo URLs (when source is “My image URLs”)',
			required: false,
			placeholder: 'One URL per line',
			visibleWhen: { mediaSource: 'uploads' },
			description: 'Direct image links or uploaded asset URLs.'
		},
		{
			key: 'mediaArrangement',
			type: 'select',
			label: 'Photo layout (when count > 1)',
			required: false,
			default: 'square',
			options: [
				{ value: 'square', label: 'Even grid (square cells)' },
				{ value: 'masonry', label: 'Masonry' },
				{ value: 'carousel', label: 'Carousel' }
			],
			description: 'With a single photo, all three look the same.'
		},
		{
			key: 'carouselIntervalMs',
			type: 'string',
			label: 'Carousel interval (ms)',
			required: false,
			placeholder: '5000',
			visibleWhen: { mediaArrangement: 'carousel' },
			description: 'Minimum 3000 ms.'
		}
	]
} as const;
