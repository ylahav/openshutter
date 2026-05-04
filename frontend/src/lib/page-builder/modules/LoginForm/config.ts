export const loginFormConfig = {
	type: 'loginForm',
	label: 'Login Form',
	description: 'Heading, subtitle, and optional root class on the login page. Use **Edit Page** (login role) for “do not display title”.',
	fields: [
		{
			key: 'class',
			type: 'string',
			label: 'Root CSS class',
			required: false,
			placeholder: 'e.g. s-login',
			description: 'Appended to the login block root (`<section class="pb-login">`) for template-specific styling.'
		},
		{
			key: 'title',
			type: 'multilangText',
			label: 'Title',
			required: true,
			default: { en: 'Sign in to your account' }
		},
		{
			key: 'subtitle',
			type: 'multilangText',
			label: 'Subtitle',
			required: false,
			description: 'Muted line under the heading; when set, replaces the default redirect-based tagline.'
		}
	]
};
