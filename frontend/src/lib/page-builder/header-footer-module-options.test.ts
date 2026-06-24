import { describe, expect, it } from 'vitest';
import {
	HEADER_MODULE_OPTIONS,
	FOOTER_MODULE_OPTIONS
} from './header-footer-module-options';
import { PAGE_MODULE_TYPES } from './module-types';

/**
 * The chrome editor on /admin/templates/header-footer and the chrome `pageType` pickers
 * on /admin/templates/overrides both import these lists. The expectations below are the
 * contract: only valid module types (subset of PAGE_MODULE_TYPES), no duplicates, sorted
 * by label, and the two lists carry the modules that actually make sense as chrome.
 */

const allKnownTypes = new Set<string>(PAGE_MODULE_TYPES.map((m) => m.type as string));

describe('HEADER_MODULE_OPTIONS / FOOTER_MODULE_OPTIONS', () => {
	it('only contain known PAGE_MODULE_TYPES entries', () => {
		for (const opt of HEADER_MODULE_OPTIONS) {
			expect(allKnownTypes.has(opt.type)).toBe(true);
		}
		for (const opt of FOOTER_MODULE_OPTIONS) {
			expect(allKnownTypes.has(opt.type)).toBe(true);
		}
	});

	it('are non-empty', () => {
		expect(HEADER_MODULE_OPTIONS.length).toBeGreaterThan(0);
		expect(FOOTER_MODULE_OPTIONS.length).toBeGreaterThan(0);
	});

	it('have no duplicate type values within each list', () => {
		const headerTypes = HEADER_MODULE_OPTIONS.map((o) => o.type);
		const footerTypes = FOOTER_MODULE_OPTIONS.map((o) => o.type);
		expect(new Set(headerTypes).size).toBe(headerTypes.length);
		expect(new Set(footerTypes).size).toBe(footerTypes.length);
	});

	it('are sorted alphabetically by label (matches overrides editor)', () => {
		const headerLabels = HEADER_MODULE_OPTIONS.map((o) => o.label);
		const footerLabels = FOOTER_MODULE_OPTIONS.map((o) => o.label);
		expect(headerLabels).toEqual([...headerLabels].sort((a, b) => a.localeCompare(b)));
		expect(footerLabels).toEqual([...footerLabels].sort((a, b) => a.localeCompare(b)));
	});

	it('include the chrome staples (logo + menu in header; richText in footer)', () => {
		expect(HEADER_MODULE_OPTIONS.find((o) => o.type === 'logo')).toBeTruthy();
		expect(HEADER_MODULE_OPTIONS.find((o) => o.type === 'menu')).toBeTruthy();
		expect(FOOTER_MODULE_OPTIONS.find((o) => o.type === 'richText')).toBeTruthy();
	});
});
