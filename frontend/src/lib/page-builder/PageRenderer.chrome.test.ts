import { describe, expect, it } from 'vitest';
import { readFileSync } from 'node:fs';
import { resolve } from 'node:path';

import type { PageData, PageModuleData } from '$lib/types/page-builder';

/**
 * PageRenderer is a top-level layout orchestrator: it imports every page-builder module
 * and runs `$effect` blocks for `setContext`. That makes full SSR rendering unreliable
 * (the existing `page-builder-modules.test.ts` only renders leaf modules for the same
 * reason). The contracts checked here are the ones `routes/[alias]/+page.svelte` relies on:
 * chrome props exist, default to `[]`, and gate a separate render branch with three
 * stacked grids — without mutating the body's `min-h-screen` wrapper for the no-chrome
 * case.
 */

const rendererPath = resolve(process.cwd(), 'src/lib/page-builder/PageRenderer.svelte');
const rendererSrc = readFileSync(rendererPath, 'utf8');

describe('PageRenderer chrome prop surface', () => {
	it('declares headerModules and footerModules typed as PageModuleData[]', () => {
		expect(rendererSrc).toMatch(/headerModules\?:\s*PageModuleData\[\]/);
		expect(rendererSrc).toMatch(/footerModules\?:\s*PageModuleData\[\]/);
	});

	it('defaults both chrome props to empty arrays so existing callers keep working', () => {
		expect(rendererSrc).toMatch(/headerModules\s*=\s*\[\]/);
		expect(rendererSrc).toMatch(/footerModules\s*=\s*\[\]/);
	});

	it('derives hasHeader / hasFooter from array length (length>0 gates each chrome grid)', () => {
		expect(rendererSrc).toMatch(/hasHeader\s*=\s*\$derived\(\s*headerModules\.length\s*>\s*0\s*\)/);
		expect(rendererSrc).toMatch(/hasFooter\s*=\s*\$derived\(\s*footerModules\.length\s*>\s*0\s*\)/);
	});

	it('infers header/footer grid dimensions independently of the body grid', () => {
		expect(rendererSrc).toMatch(/headerLayout\s*=\s*\$derived\(inferGridLayout\(headerModules\)\)/);
		expect(rendererSrc).toMatch(/footerLayout\s*=\s*\$derived\(inferGridLayout\(footerModules\)\)/);
	});
});

describe('PageRenderer chrome render branches', () => {
	it('uses a dedicated branch when either chrome array is non-empty', () => {
		expect(rendererSrc).toMatch(/{:else if hasHeader \|\| hasFooter}/);
	});

	it('keeps the legacy (chrome-less) branch as the trailing fallback', () => {
		const chromeIdx = rendererSrc.indexOf('hasHeader || hasFooter');
		const fallbackIdx = rendererSrc.indexOf('{:else}', chromeIdx);
		expect(chromeIdx).toBeGreaterThan(-1);
		expect(fallbackIdx).toBeGreaterThan(chromeIdx);
	});

	it('stacks header > body > footer inside the chrome branch', () => {
		const chromeBlock = rendererSrc.slice(
			rendererSrc.indexOf('hasHeader || hasFooter'),
			rendererSrc.indexOf('{:else}', rendererSrc.indexOf('hasHeader || hasFooter'))
		);
		const headerIdx = chromeBlock.indexOf('pb-page-header');
		const bodyIdx = chromeBlock.indexOf('min-h-screen');
		const footerIdx = chromeBlock.indexOf('pb-page-footer');
		expect(headerIdx).toBeGreaterThan(-1);
		expect(bodyIdx).toBeGreaterThan(headerIdx);
		expect(footerIdx).toBeGreaterThan(bodyIdx);
	});

	it('passes the inferred chrome layout to each chrome PageBuilderGrid', () => {
		const chromeBlock = rendererSrc.slice(rendererSrc.indexOf('hasHeader || hasFooter'));
		expect(chromeBlock).toMatch(/layout=\{headerLayout\}/);
		expect(chromeBlock).toMatch(/layout=\{footerLayout\}/);
		expect(chromeBlock).toMatch(/modules=\{normalizedHeaderModules\}/);
		expect(chromeBlock).toMatch(/modules=\{normalizedFooterModules\}/);
	});

	it('leaves the chrome-less fallback branch identical to the legacy single-grid layout', () => {
		const fallbackStart = rendererSrc.indexOf('{:else}', rendererSrc.indexOf('hasHeader || hasFooter'));
		const fallbackBlock = rendererSrc.slice(fallbackStart);
		expect(fallbackBlock).toMatch(/min-h-screen/);
		expect(fallbackBlock).not.toMatch(/pb-page-header/);
		expect(fallbackBlock).not.toMatch(/pb-page-footer/);
	});
});

describe('PageRenderer chrome type assignability (compile-time smoke)', () => {
	const samplePage: PageData = {
		_id: 'p1',
		title: 'Test',
		alias: 'test',
		showHeader: true,
		showFooter: false
	};

	const sampleModule: PageModuleData = {
		_id: 'm1',
		pageId: 'p1',
		type: 'richText',
		rowOrder: 0,
		columnIndex: 0,
		props: {}
	};

	it('accepts PageData with showHeader/showFooter flags', () => {
		expect(samplePage.showHeader).toBe(true);
		expect(samplePage.showFooter).toBe(false);
	});

	it('accepts header/footer arrays of PageModuleData', () => {
		const headerModules: PageModuleData[] = [sampleModule];
		const footerModules: PageModuleData[] = [];
		expect(headerModules.length + footerModules.length).toBe(1);
	});
});
