import { describe, expect, it } from 'vitest';
import {
	getTemplatePack,
	isKnownTemplatePack,
	listTemplatePacks,
	TEMPLATE_PACK_IDS,
} from './registry';

describe('template pack registry', () => {
	it('exposes four built-in pack ids', () => {
		expect(TEMPLATE_PACK_IDS).toEqual(['default', 'minimal', 'modern', 'elegant']);
	});

	it('isKnownTemplatePack accepts built-ins (case-insensitive) and rejects unknown', () => {
		expect(isKnownTemplatePack('modern')).toBe(true);
		expect(isKnownTemplatePack('MODERN')).toBe(true);
		expect(isKnownTemplatePack(' default ')).toBe(true);
		expect(isKnownTemplatePack('')).toBe(false);
		expect(isKnownTemplatePack('custom-theme')).toBe(false);
		expect(isKnownTemplatePack(null)).toBe(false);
		expect(isKnownTemplatePack(undefined)).toBe(false);
	});

	it('getTemplatePack returns the requested pack', () => {
		expect(getTemplatePack('elegant').name).toBe('elegant');
		expect(getTemplatePack('minimal').pages).toBeDefined();
	});

	it('getTemplatePack falls back to default for unknown ids', () => {
		const pack = getTemplatePack('no-such-pack');
		expect(pack.name).toBe('default');
	});

	it('listTemplatePacks returns one entry per built-in id', () => {
		const list = listTemplatePacks();
		expect(list.length).toBe(4);
		const names = new Set(list.map((p) => p.name));
		expect(names).toEqual(new Set(TEMPLATE_PACK_IDS));
	});
});
