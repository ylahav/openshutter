// frontend/src/lib/page-builder/modules/LanguageSelector/config.ts
export const languageSelectorConfig = {
	type: 'languageSelector',
	label: 'Language Selector',
	description: 'Language switcher dropdown',
	fields: [
		{ key: 'showFlags', type: 'boolean', label: 'Show flags', default: true },
		{ key: 'showNativeNames', type: 'boolean', label: 'Show native names', default: true },
		{ key: 'compact', type: 'boolean', label: 'Compact mode', default: false },
		{ key: 'className', type: 'string', label: 'CSS classes', required: false }
	]
} as const;
