/**
 * Module-type allow-list for the two site-wide chrome editors:
 * `/admin/templates/header-footer` and the chrome pickers in `/admin/templates/overrides`.
 * Header and footer share the same list so authors can place the same modules in either region.
 *
 * Picker order: alphabetical by label, matching `sortModuleOptions` in the overrides editor.
 */
import { PAGE_MODULE_TYPES } from './module-types';

export type ModuleTypeOption = { type: string; label: string };

const CHROME_ALLOWED = new Set([
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
	'layoutShell',
	'richText',
	'cta',
	'searchForm'
]);

function byLabel(a: ModuleTypeOption, b: ModuleTypeOption): number {
	return a.label.localeCompare(b.label);
}

const CHROME_OPTIONS: ModuleTypeOption[] = [...PAGE_MODULE_TYPES]
	.filter((m) => CHROME_ALLOWED.has(m.type))
	.sort(byLabel);

export const HEADER_MODULE_OPTIONS: ModuleTypeOption[] = CHROME_OPTIONS;
export const FOOTER_MODULE_OPTIONS: ModuleTypeOption[] = CHROME_OPTIONS;
