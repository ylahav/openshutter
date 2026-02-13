// frontend/src/lib/page-builder/modules/SocialMedia/config.ts
export const socialMediaConfig = {
	type: 'socialMedia',
	label: 'Social Media',
	description: 'Display social media links (Facebook, Instagram, Twitter, LinkedIn)',
	fields: [
		{ 
			key: 'socialMedia', 
			type: 'object', 
			label: 'Social Media URLs', 
			description: 'Override site-wide social media links (leave empty to use site config)',
			fields: [
				{ key: 'facebook', type: 'string', label: 'Facebook URL', required: false },
				{ key: 'instagram', type: 'string', label: 'Instagram URL', required: false },
				{ key: 'twitter', type: 'string', label: 'Twitter URL', required: false },
				{ key: 'linkedin', type: 'string', label: 'LinkedIn URL', required: false }
			]
		},
		{ key: 'iconSize', type: 'string', label: 'Icon Size', default: 'md', options: ['sm', 'md', 'lg'] },
		{ key: 'iconColor', type: 'string', label: 'Icon Color', default: 'current', description: 'CSS color or Tailwind color class' },
		{ key: 'showLabels', type: 'boolean', label: 'Show Labels', default: false },
		{ key: 'orientation', type: 'string', label: 'Orientation', default: 'horizontal', options: ['horizontal', 'vertical'] },
		{ key: 'align', type: 'string', label: 'Alignment', default: 'start', options: ['start', 'center', 'end'] },
		{ key: 'gap', type: 'string', label: 'Gap Size', default: 'normal', options: ['tight', 'normal', 'loose'] },
		{ key: 'className', type: 'string', label: 'CSS Classes', required: false }
	]
} as const;
