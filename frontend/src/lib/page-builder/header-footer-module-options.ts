/**
 * Module-type allow-lists for the two site-wide chrome editors:
 * `/admin/templates/header-footer` (this PR) and the chrome `pageType` pickers in
 * `/admin/templates/overrides` (existing). Keeping both surfaces on one list avoids
 * the "I saw this module in one editor but not the other" mismatch.
 *
 * Picker order: alphabetical by label, matching `sortModuleOptions` in the overrides editor.
 */
import { PAGE_MODULE_TYPES } from './module-types';

export type ModuleTypeOption = { type: string; label: string };

const HEADER_ALLOWED = new Set([
	'logo',
	'siteTitle',
	'menu',
	'languageSelector',
	'themeToggle',
	'themeSelect',
	'userGreeting',
	'authButtons',
	'socialMedia',
	'divider',
	'layoutShell'
]);

const FOOTER_ALLOWED = new Set([
	'richText',
	'divider',
	'cta',
	'socialMedia',
	'themeSelect',
	'layoutShell'
]);

function byLabel(a: ModuleTypeOption, b: ModuleTypeOption): number {
	return a.label.localeCompare(b.label);
}

export const HEADER_MODULE_OPTIONS: ModuleTypeOption[] = [...PAGE_MODULE_TYPES]
	.filter((m) => HEADER_ALLOWED.has(m.type))
	.sort(byLabel);

export const FOOTER_MODULE_OPTIONS: ModuleTypeOption[] = [...PAGE_MODULE_TYPES]
	.filter((m) => FOOTER_ALLOWED.has(m.type))
	.sort(byLabel);
