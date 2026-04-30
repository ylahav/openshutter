// frontend/src/lib/page-builder/modules/ThemeToggle/config.ts
export const themeToggleConfig = {
	type: 'themeToggle',
	label: 'Theme Toggle',
	description: 'Toggle between light and dark theme',
	fields: [
		{
			key: 'variant',
			type: 'select',
			label: 'Display',
			options: ['icons', 'text'],
			default: 'icons',
			description: 'Icons (sun/moon) or text labels (Light / Dark).'
		}
	]
} as const;
