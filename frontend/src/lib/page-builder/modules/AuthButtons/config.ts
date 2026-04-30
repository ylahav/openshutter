// frontend/src/lib/page-builder/modules/AuthButtons/config.ts
export const authButtonsConfig = {
	type: 'authButtons',
	label: 'Auth Buttons',
	description: 'Login/Logout buttons based on authentication status',
	fields: [
		{ key: 'loginLabel', type: 'string', label: 'Login button label', default: 'Login' },
		{ key: 'logoutLabel', type: 'string', label: 'Logout button label', default: 'Logout' },
		{ key: 'loginUrl', type: 'string', label: 'Login URL', default: '/login' },
		{ key: 'buttonClass', type: 'string', label: 'Base button CSS classes', default: 'auth-btn' },
		{
			key: 'loginButtonClass',
			type: 'string',
			label: 'Login button CSS classes',
			required: false,
			default: 'auth-btn auth-btn--login'
		},
		{
			key: 'logoutButtonClass',
			type: 'string',
			label: 'Logout button CSS classes',
			required: false,
			default: 'auth-btn auth-btn--logout'
		},
		{ key: 'containerClass', type: 'string', label: 'Container CSS classes', default: 'auth-btns' }
	]
} as const;
