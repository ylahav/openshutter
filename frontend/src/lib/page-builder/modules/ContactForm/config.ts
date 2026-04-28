export const contactFormConfig = {
	type: 'contactForm',
	label: 'Contact Form',
	description: 'Visitor contact form with mailto or webhook submit modes.',
	fields: [
		{ key: 'title', type: 'multilangText', label: 'Title', required: false },
		{ key: 'description', type: 'multilangText', label: 'Description', required: false },
		{ key: 'showSidebar', type: 'boolean', label: 'Show sidebar', default: true },
		{ key: 'sidebarTitle', type: 'multilangText', label: 'Sidebar title', required: false },
		{ key: 'showSidebarEmail', type: 'boolean', label: 'Sidebar: show email', default: true },
		{
			key: 'sidebarEmail',
			type: 'string',
			label: 'Sidebar email override',
			required: false,
			placeholder: 'hello@example.com'
		},
		{ key: 'showSidebarPhone', type: 'boolean', label: 'Sidebar: show phone', default: true },
		{
			key: 'sidebarPhone',
			type: 'string',
			label: 'Sidebar phone override',
			required: false,
			placeholder: '+1 555 000 0000'
		},
		{ key: 'showSidebarAddress', type: 'boolean', label: 'Sidebar: show address', default: false },
		{
			key: 'sidebarAddress',
			type: 'multilangText',
			label: 'Sidebar address override',
			required: false
		},
		{ key: 'showSidebarSocial', type: 'boolean', label: 'Sidebar: show social links', default: true },
		{ key: 'showInstagram', type: 'boolean', label: 'Social: Instagram', default: true },
		{ key: 'showFlickr', type: 'boolean', label: 'Social: Flickr', default: true },
		{ key: 'showFacebook', type: 'boolean', label: 'Social: Facebook', default: true },
		{ key: 'showTwitter', type: 'boolean', label: 'Social: X / Twitter', default: true },
		{ key: 'showLinkedin', type: 'boolean', label: 'Social: LinkedIn', default: true },
		{ key: 'showYoutube', type: 'boolean', label: 'Social: YouTube', default: true },
		{ key: 'showGithub', type: 'boolean', label: 'Social: GitHub', default: true },
		{
			key: 'socialLinks',
			type: 'socialLinks',
			label: 'Sidebar social links',
			required: false,
			description: 'If empty, uses Site Config social media values.'
		},
		{ key: 'showPhoneField', type: 'boolean', label: 'Show phone field in form', default: false },
		{
			key: 'submitLabel',
			type: 'multilangText',
			label: 'Submit button label',
			default: 'Send Message'
		},
		{
			key: 'successMessage',
			type: 'multilangText',
			label: 'Success message',
			default: 'Thank you.\nYour message has been received — I will be in touch.'
		}
	]
} as const;
