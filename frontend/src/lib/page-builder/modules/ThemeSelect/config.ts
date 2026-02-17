// frontend/src/lib/page-builder/modules/ThemeSelect/config.ts
export const themeSelectConfig = {
	type: 'themeSelect',
	label: 'Theme Select',
	description: 'Let end users switch among site themes (Minimal, Modern, Elegant)',
	fields: [
		{ key: 'compact', type: 'boolean', label: 'Compact mode', default: false },
		{ key: 'className', type: 'string', label: 'CSS classes', required: false }
	]
} as const;
