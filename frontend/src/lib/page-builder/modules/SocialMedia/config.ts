// frontend/src/lib/page-builder/modules/SocialMedia/config.ts
export const socialMediaConfig = {
	type: 'socialMedia',
	label: 'Social Media',
	description: 'Choose icon or text links, then pick which URLs to show (or leave the list empty to use Site settings → Contact).',
	fields: [
		{
			key: 'linkDisplay',
			type: 'select',
			label: 'Display',
			required: true,
			default: 'icon',
			options: [
				{ value: 'icon', label: 'Icons' },
				{ value: 'text', label: 'Text' },
			],
			description: 'Icons (with optional labels below) or text-only links.',
		},
		{
			key: 'links',
			type: 'socialLinks',
			label: 'Links to show',
			required: false,
			description:
				'If you add at least one URL here, only those links are shown. If you leave this empty, the module uses social URLs from Site settings → Contact.',
		},
		{ key: 'iconSize', type: 'string', label: 'Icon Size', default: 'md', options: ['sm', 'md', 'lg'], visibleWhen: { linkDisplay: 'icon' } },
		{ key: 'iconColor', type: 'string', label: 'Icon Color', default: 'current', description: 'CSS color or Tailwind color class', visibleWhen: { linkDisplay: 'icon' } },
		{ key: 'showLabels', type: 'boolean', label: 'Show Labels', default: false, visibleWhen: { linkDisplay: 'icon' } },
		{ key: 'orientation', type: 'string', label: 'Orientation', default: 'horizontal', options: ['horizontal', 'vertical'] },
		{ key: 'align', type: 'string', label: 'Alignment', default: 'start', options: ['start', 'center', 'end'] },
		{ key: 'gap', type: 'string', label: 'Gap Size', default: 'normal', options: ['tight', 'normal', 'loose'] },
		{ key: 'className', type: 'string', label: 'CSS Classes', required: false },
	],
} as const;
