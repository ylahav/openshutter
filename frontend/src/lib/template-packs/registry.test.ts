import { describe, it, expect } from 'vitest';
import {
	TEMPLATE_PACK_IDS,
	getTemplatePack,
	isKnownTemplatePack,
	listTemplatePacks,
	normalizeTemplatePackId
} from './registry';

describe('template pack registry', () => {
	it('exports built-in pack ids', () => {
		expect(TEMPLATE_PACK_IDS).toEqual(['noir', 'studio', 'atelier']);
	});

	it('isKnownTemplatePack recognizes built-ins and legacy ids', () => {
		expect(isKnownTemplatePack('noir')).toBe(true);
		expect(isKnownTemplatePack('studio')).toBe(true);
		expect(isKnownTemplatePack('atelier')).toBe(true);
		expect(isKnownTemplatePack('simple')).toBe(true);
		expect(isKnownTemplatePack('modern')).toBe(true);
		expect(isKnownTemplatePack('elegant')).toBe(true);
		expect(isKnownTemplatePack(' default ')).toBe(true);
		expect(isKnownTemplatePack('default')).toBe(true);
		expect(isKnownTemplatePack('minimal')).toBe(true);
		expect(isKnownTemplatePack('unknown')).toBe(false);
	});

	it('normalizeTemplatePackId maps legacy packs to noir', () => {
		expect(normalizeTemplatePackId('default')).toBe('noir');
		expect(normalizeTemplatePackId('minimal')).toBe('noir');
		expect(normalizeTemplatePackId('simple')).toBe('noir');
		expect(normalizeTemplatePackId('modern')).toBe('noir');
		expect(normalizeTemplatePackId('elegant')).toBe('noir');
		expect(normalizeTemplatePackId('noir')).toBe('noir');
		expect(normalizeTemplatePackId('studio')).toBe('studio');
		expect(normalizeTemplatePackId('atelier')).toBe('atelier');
	});

	it(
		'getTemplatePack returns the requested pack',
		async () => {
			const atelier = await getTemplatePack('atelier');
			const studio = await getTemplatePack('studio');
			expect(atelier.name).toBe('atelier');
			expect(studio.pages).toBeDefined();
		},
		15_000,
	);

	it('getTemplatePack falls back to atelier for unknown ids', async () => {
		const pack = await getTemplatePack('not-a-real-pack');
		expect(pack.name).toBe('atelier');
	});

	it(
		'listTemplatePacks returns one entry per built-in id',
		async () => {
			const packs = await listTemplatePacks();
			const names = new Set(packs.map((p) => p.name));
			expect(names).toEqual(new Set(TEMPLATE_PACK_IDS));
		},
		15_000,
	);
});
