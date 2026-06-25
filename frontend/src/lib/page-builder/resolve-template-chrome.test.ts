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
		expect(out.headerModules).toEqual(headerStudio);
		expect(out.footerModules).toEqual(footerDefault);
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
		expect(out.headerModules).toEqual(headerDefault);
		expect(out.footerModules).toEqual(footerDefault);
	});

	it('handles missing template / null siteConfig', () => {
		expect(resolveTemplateChrome(null, 'studio')).toEqual({
			headerModules: [],
			footerModules: []
		});
		expect(resolveTemplateChrome({}, 'studio')).toEqual({
			headerModules: [],
			footerModules: []
		});
		expect(resolveTemplateChrome({ template: {} }, 'studio')).toEqual({
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
});
