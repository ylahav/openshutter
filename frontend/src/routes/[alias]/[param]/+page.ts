import { error } from '@sveltejs/kit';
import type { PageLoad } from './$types';
import { packClassPrefixFor } from '$lib/template/packs/class-prefix';
import { resolvePageAliasPrefixes, resolveSiteTemplatePack } from '$lib/utils/template-page-alias';
import {
	fetchVisitorSiteConfig,
	resolveCmsPublishedPage
} from '$lib/utils/resolve-cms-page-load';
import { isPackAlbumShellRoute } from '$lib/utils/album-route-params';
import { resolveTemplateChrome } from '$lib/page-builder/resolve-template-chrome';

/**
 * Two-segment public URLs: `/[alias]/[param]` (e.g. `/album/2026-05-01`).
 *
 * Resolution (aligned with `/api/pages/[slug]` for the **first** segment only):
 * 1. CMS slug `{prefix}-{alias}` when configured (e.g. `s-album`).
 * 2. CMS slug `{alias}` (e.g. `album`).
 * 3. Pack shell `pages.Album` for known gallery shells when CMS has no row.
 * 4. 404
 *
 * Steps 1–2 use the same `{prefix}-{alias}` / `{alias}` rules as `resolveCmsPublishedPage` (via `buildTemplateAwareAliasCandidates`), i.e. the same prefix as `packClassPrefixFor(frontendTemplate, pageAliasPrefixes)`.
 */
const RESERVED_FIRST_SEGMENTS = new Set([
	'admin',
	'api',
	'albums',
	'photos',
	'owner',
	'page',
	'member',
	'setup',
	'search',
	'auth',
	'login',
	'developers',
	'marketplace',
	'blog'
]);

export const load: PageLoad = async ({ params, fetch, parent }) => {
	const a = String(params.alias ?? '').trim();
	const p = String(params.param ?? '').trim();
	if (!a || !p) throw error(404, 'Not found');
	if (RESERVED_FIRST_SEGMENTS.has(a.toLowerCase())) {
		throw error(404, 'Not found');
	}

	const parentData = await parent();
	const siteConfig =
		parentData.siteConfig ??
		parentData.visitorSiteConfig ??
		(await fetchVisitorSiteConfig(fetch));
	const packHint =
		(typeof parentData.visitorTemplatePack === 'string' && parentData.visitorTemplatePack.trim()
			? parentData.visitorTemplatePack.trim()
			: undefined) ?? resolveSiteTemplatePack(siteConfig);
	const pageAliasPrefixes = resolvePageAliasPrefixes(siteConfig);
	const prefix = packClassPrefixFor(
		(siteConfig as { template?: { frontendTemplate?: string | null } } | null)?.template
			?.frontendTemplate ?? packHint,
		pageAliasPrefixes
	);

	const resolved = await resolveCmsPublishedPage(fetch, {
		baseAlias: a,
		siteConfig,
		packHint,
		extraRequests: []
	});

	const packId = packHint || 'atelier';

	if (resolved) {
		const resolvedPage = (resolved.page ?? null) as { showHeader?: unknown; showFooter?: unknown } | null;
		const wantsHeader = resolvedPage?.showHeader === true;
		const wantsFooter = resolvedPage?.showFooter === true;
		const chrome =
			wantsHeader || wantsFooter
				? resolveTemplateChrome(siteConfig, packId)
				: {
						headerModules: [],
						footerModules: [],
						headerSticky: false,
						headerRowTemplates: {} as Record<string, string>,
						footerRowTemplates: {} as Record<string, string>
					};

		// `cmsSlugPrefix`: same letter used for step-1 slug `${prefix}-${alias}` inside `resolveCmsPublishedPage`.
		return {
			mode: 'cms' as const,
			page: resolved.page,
			modules: resolved.modules,
			headerModules: wantsHeader ? chrome.headerModules : [],
			footerModules: wantsFooter ? chrome.footerModules : [],
			headerSticky: wantsHeader ? chrome.headerSticky : false,
			headerRowTemplates: wantsHeader ? chrome.headerRowTemplates : undefined,
			footerRowTemplates: wantsFooter ? chrome.footerRowTemplates : undefined,
			urlAlias: a,
			urlParam: p,
			packId,
			cmsSlugPrefix: prefix
		};
	}

	if (isPackAlbumShellRoute(a)) {
		return {
			mode: 'pack-album' as const,
			page: null,
			modules: [] as unknown[],
			headerModules: [],
			footerModules: [],
			headerSticky: false,
			headerRowTemplates: undefined as Record<string, string> | undefined,
			footerRowTemplates: undefined as Record<string, string> | undefined,
			urlAlias: a,
			urlParam: p,
			packId,
			cmsSlugPrefix: prefix
		};
	}

	throw error(404, 'Not found');
};
