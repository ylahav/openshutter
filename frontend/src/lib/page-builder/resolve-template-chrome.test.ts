import { describe, expect, it } from 'vitest';
import type { PageModuleData } from '$lib/types/page-builder';
import {
	resolveChromeForPack,
	resolveTemplateChrome
} from './resolve-template-chrome';

function mod(id: string): PageModuleData {
	return {
		_id: id,
		pageId: 'p',
		type: 'richText',
		rowOrder: 0,
		columnIndex: 0,
		props: {}
	};
}

describe('resolveChromeForPack', () => {
	const defaultArr = [mod('default-1')];
	const studioArr = [mod('studio-1'), mod('studio-2')];

	it('returns pack override when present and non-empty', () => {
		const out = resolveChromeForPack(
			{ siteDefault: defaultArr, byPack: { studio: studioArr } },
			'studio'
		);
		expect(out).toEqual(studioArr);
	});

	it('falls back to site default when pack override is `[]` (empty arrays inherit so header/footer are independent)', () => {
		const out = resolveChromeForPack(
			{ siteDefault: defaultArr, byPack: { studio: [] } },
			'studio'
		);
		expect(out).toEqual(defaultArr);
	});

	it('falls back to site default when pack key absent from byPack', () => {
		const out = resolveChromeForPack(
			{ siteDefault: defaultArr, byPack: { noir: studioArr } },
			'studio'
		);
		expect(out).toEqual(defaultArr);
	});

	it('falls back to site default when byPack is missing entirely', () => {
		const out = resolveChromeForPack({ siteDefault: defaultArr }, 'studio');
		expect(out).toEqual(defaultArr);
	});

	it('falls back to site default when byPack[pack] is explicitly null (treated as inherit)', () => {
		const out = resolveChromeForPack(
			{ siteDefault: defaultArr, byPack: { studio: null } },
			'studio'
		);
		expect(out).toEqual(defaultArr);
	});

	it('returns empty array when neither override nor default is set', () => {
		expect(resolveChromeForPack({}, 'studio')).toEqual([]);
		expect(resolveChromeForPack(null, 'studio')).toEqual([]);
		expect(resolveChromeForPack(undefined, 'studio')).toEqual([]);
	});

	it('normalizes legacy pack ids (`default` → `noir`)', () => {
		const out = resolveChromeForPack(
			{ siteDefault: defaultArr, byPack: { noir: studioArr } },
			'default'
		);
		expect(out).toEqual(studioArr);
	});

	it('uses fallback pack (atelier) for unknown ids when looking up byPack', () => {
		const out = resolveChromeForPack(
			{ siteDefault: defaultArr, byPack: { atelier: studioArr } },
			'nonsense'
		);
		expect(out).toEqual(studioArr);
	});
});

describe('resolveTemplateChrome', () => {
	const headerDefault = [mod('h-default')];
	const footerDefault = [mod('f-default')];
	const headerStudio = [mod('h-studio')];

	it('resolves header and footer independently: pack-overridden header + empty-array footer inherits default footer', () => {
		const out = resolveTemplateChrome(
			{
				template: {
					headerModules: headerDefault,
					footerModules: footerDefault,
					headerModulesByPack: { studio: headerStudio },
					footerModulesByPack: { studio: [] }
				}
			},
			'studio'
		);
		expect(out).toMatchObject({ headerModules: headerStudio, footerModules: footerDefault });
	});

	it('falls back to defaults when pack absent from both maps', () => {
		const out = resolveTemplateChrome(
			{
				template: {
					headerModules: headerDefault,
					footerModules: footerDefault,
					headerModulesByPack: { noir: headerStudio }
				}
			},
			'atelier'
		);
		expect(out).toMatchObject({ headerModules: headerDefault, footerModules: footerDefault });
	});

	it('handles missing template / null siteConfig', () => {
		expect(resolveTemplateChrome(null, 'studio')).toMatchObject({
			headerModules: [],
			footerModules: []
		});
		expect(resolveTemplateChrome({}, 'studio')).toMatchObject({
			headerModules: [],
			footerModules: []
		});
		expect(resolveTemplateChrome({ template: {} }, 'studio')).toMatchObject({
			headerModules: [],
			footerModules: []
		});
	});

	it('ignores non-object byPack values defensively', () => {
		const out = resolveTemplateChrome(
			{
				template: {
					headerModules: headerDefault,
					headerModulesByPack: 'oops'
				}
			},
			'studio'
		);
		expect(out.headerModules).toEqual(headerDefault);
	});

	it('defaults headerSticky to false and row templates to empty when nothing is set', () => {
		const out = resolveTemplateChrome({ template: {} }, 'studio');
		expect(out.headerSticky).toBe(false);
		expect(out.headerRowTemplates).toEqual({});
		expect(out.footerRowTemplates).toEqual({});
	});

	it('per-pack override wins for headerSticky and row templates', () => {
		const out = resolveTemplateChrome(
			{
				template: {
					headerSticky: false,
					headerStickyByPack: { studio: true },
					headerRowTemplates: { '0': 'auto 1fr auto' },
					headerRowTemplatesByPack: { studio: { '0': '1-3-1' } },
					footerRowTemplates: { '0': '1fr 1fr' }
				}
			},
			'studio'
		);
		expect(out.headerSticky).toBe(true);
		expect(out.headerRowTemplates).toEqual({ '0': '1-3-1' });
		expect(out.footerRowTemplates).toEqual({ '0': '1fr 1fr' });
	});
});
