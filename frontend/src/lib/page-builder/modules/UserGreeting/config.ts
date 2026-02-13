// frontend/src/lib/page-builder/modules/UserGreeting/config.ts
export const userGreetingConfig = {
	type: 'userGreeting',
	label: 'User Greeting',
	description: 'Displays a greeting message when user is logged in',
	fields: [
		{ key: 'greeting', type: 'string', label: 'Greeting text', default: 'Hello' },
		{ key: 'showEmail', type: 'boolean', label: 'Show email if name not available', default: false },
		{ key: 'className', type: 'string', label: 'CSS classes', required: false }
	]
} as const;
