import { describe, expect, it } from 'vitest';
import { render as renderSsr } from 'svelte/server';
import { readFileSync } from 'node:fs';
import { resolve } from 'node:path';

import HeroModule from './modules/HeroModule.svelte';
import RichTextModule from './modules/RichTextModule.svelte';
import FeatureGridModule from './modules/FeatureGridModule.svelte';
import AlbumsGridModule from './modules/AlbumsGridModule.svelte';
import AlbumGalleryModule from './modules/AlbumGalleryModule.svelte';
import CtaModule from './modules/CtaModule.svelte';
import BlogCategoryModule from './modules/BlogCategoryModule.svelte';
import BlogArticleModule from './modules/BlogArticleModule.svelte';
import DividerModule from './modules/DividerModule.svelte';

type SmokeCase = {
	name: string;
	component: any;
	defaultProps: Record<string, unknown>;
	invalidProps: Record<string, unknown>;
};

const smokeCases: SmokeCase[] = [
	{
		name: 'Hero',
		component: HeroModule,
		defaultProps: {},
		invalidProps: { title: 123, subtitle: null, backgroundStyle: 'bad-value' }
	},
	{
		name: 'Rich Text',
		component: RichTextModule,
		defaultProps: {},
		invalidProps: { title: ['bad'], body: 42, background: 'bad-value' }
	},
	{
		name: 'Feature Grid',
		component: FeatureGridModule,
		defaultProps: {},
		invalidProps: { title: null, features: [{ title: null, description: undefined }] }
	},
	{
		name: 'Albums Grid',
		component: AlbumsGridModule,
		defaultProps: {},
		invalidProps: { albumSource: 'bad-value', selectedAlbums: 'not-array' }
	},
	{
		name: 'Album view',
		component: AlbumGalleryModule,
		defaultProps: {},
		invalidProps: { albumSource: 'bad-value', selectedAlbums: 123 }
	},
	{
		name: 'Call to Action',
		component: CtaModule,
		defaultProps: {},
		invalidProps: { primaryLabel: 77, secondaryLabel: false, primaryHref: 3 }
	},
	{
		name: 'Blog categories',
		component: BlogCategoryModule,
		defaultProps: {},
		invalidProps: { layout: 'bad-value', maxItems: -100, title: 1 }
	},
	{
		name: 'Blog articles',
		component: BlogArticleModule,
		defaultProps: {},
		invalidProps: { mode: 'bad-value', limit: -1, slug: 999 }
	},
	{
		name: 'Divider',
		component: DividerModule,
		defaultProps: {},
		invalidProps: { thickness: 'huge', margin: false, lineStyle: 1 }
	}
];

describe('page-builder module render safety', () => {
	for (const testCase of smokeCases) {
		it(`${testCase.name} renders with default props`, () => {
			expect(() => renderSsr(testCase.component, { props: testCase.defaultProps })).not.toThrow();
		});

		it(`${testCase.name} renders with invalid props without throwing`, () => {
			expect(() => renderSsr(testCase.component, { props: testCase.invalidProps as any })).not.toThrow();
		});
	}
});

describe('page-builder registry consistency', () => {
	const frontendRoot = resolve(process.cwd());
	const moduleTypesPath = resolve(frontendRoot, 'src/lib/page-builder/module-types.ts');
	const pageRendererPath = resolve(frontendRoot, 'src/lib/page-builder/PageRenderer.svelte');
	const overridesPath = resolve(frontendRoot, 'src/routes/admin/templates/overrides/+page.svelte');

	const moduleTypesSrc = readFileSync(moduleTypesPath, 'utf8');
	const pageRendererSrc = readFileSync(pageRendererPath, 'utf8');
	const overridesSrc = readFileSync(overridesPath, 'utf8');

	function getAliasesFromModuleTypes(source: string): string[] {
		const aliases = [...source.matchAll(/type:\s*'([^']+)'/g)].map((m) => m[1]);
		return Array.from(new Set(aliases));
	}

	function getAliasesFromMap(source: string): string[] {
		const blockMatch = source.match(/const moduleMap:[\s\S]*?=\s*\{([\s\S]*?)\n\t\};/);
		if (!blockMatch) return [];
		return [...blockMatch[1].matchAll(/^\s*([a-zA-Z][a-zA-Z0-9]*)\s*:/gm)].map((m) => m[1]);
	}

	function getFilterAliases(source: string, constName: string): string[] {
		const start = source.indexOf(`const ${constName}`);
		if (start === -1) return [];
		const end = source.indexOf('].includes(m.type)', start);
		if (end === -1) return [];
		const block = source.slice(start, end);
		return [...block.matchAll(/'([^']+)'/g)].map((m) => m[1]);
	}

	it('keeps content picker aliases synced with registered/rendered aliases', () => {
		const moduleTypeAliases = getAliasesFromModuleTypes(moduleTypesSrc);
		const moduleMapAliases = getAliasesFromMap(pageRendererSrc);
		const contentAliases = getFilterAliases(overridesSrc, 'PAGE_CONTENT_MODULES');

		const contentRequired = ['hero', 'richText', 'featureGrid', 'albumsGrid', 'albumView', 'cta', 'blogCategory', 'blogArticle'];

		for (const alias of contentRequired) {
			expect(moduleTypeAliases).toContain(alias);
			expect(moduleMapAliases).toContain(alias);
			expect(contentAliases).toContain(alias);
		}
	});

	it('maps albumsGrid and albumView to different module components', () => {
		const albumsGridLine = pageRendererSrc.match(/albumsGrid:\s*([A-Za-z0-9_]+)/)?.[1];
		const albumViewLine = pageRendererSrc.match(/albumView:\s*([A-Za-z0-9_]+)/)?.[1];

		expect(albumsGridLine).toBe('AlbumsGridModule');
		expect(albumViewLine).toBe('AlbumGalleryModule');
		expect(albumsGridLine).not.toBe(albumViewLine);
	});
});
