import { error } from '@sveltejs/kit';
import type { PageLoad } from './$types';
import { packClassPrefixFor } from '$lib/template/packs/class-prefix';
import { resolvePageAliasPrefixes, resolveSiteTemplatePack } from '$lib/utils/template-page-alias';
import {
	fetchVisitorSiteConfig,
	loginRoleFallbackRequests,
	resolveCmsPublishedPage
} from '$lib/utils/resolve-cms-page-load';
import { resolveTemplateChrome } from '$lib/page-builder/resolve-template-chrome';

/**
 * Single-segment public URLs: `/[alias]` (e.g. `/login`, `/about`).
 *
 * Resolution (same CMS rules as `[alias]/[param]/+page.ts` for the path segment):
 * 1. CMS slug `{prefix}-{alias}` when configured (e.g. `s-login`).
 * 2. CMS slug `{alias}` (e.g. `login`).
 * 3. **Login only:** extra API `?role=login&pack=…` when no published row matched steps 1–2 (legacy; does not require `isPublished`).
 * 4. **Login only:** always render the login shell (`LoginCmsPageBody`); if no CMS document, `page` is null (theme defaults).
 * 5. Other aliases: if no CMS match → 404.
 *
 * `cmsSlugPrefix` matches step 1 (`packClassPrefixFor` + `buildTemplateAwareAliasCandidates` inside `resolveCmsPublishedPage`).
 */
export const load: PageLoad = async ({ params, fetch, parent }) => {
	const alias = params.alias;

	const knownRoutes = [
		'admin',
		'api',
		'albums',
		'photos',
		'owner',
		'page',
		'member',
		'setup',
		'search',
		'auth'
	];
	const staticAssets = ['favicon.ico', 'favicon.svg', 'robots.txt', 'sitemap.xml'];
	const lower = alias?.toLowerCase() || '';
	if (knownRoutes.includes(lower) || staticAssets.includes(lower)) {
		throw error(404, 'Not found');
	}

	if (!alias) {
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

	const extraRequests = lower === 'login' ? loginRoleFallbackRequests(packHint) : [];

	try {
		const resolved = await resolveCmsPublishedPage(fetch, {
			baseAlias: alias,
			siteConfig,
			packHint,
			extraRequests
		});

		const packId = packHint || 'atelier';

		const { headerModules: siteHeaderModules, footerModules: siteFooterModules } =
			resolveTemplateChrome(siteConfig, packId);

		const resolvedPage = (resolved?.page ?? null) as { showHeader?: unknown; showFooter?: unknown } | null;
		const wantsHeader = resolvedPage?.showHeader === true;
		const wantsFooter = resolvedPage?.showFooter === true;

		if (lower === 'login') {
			return {
				page: (resolved?.page ?? null) as unknown,
				modules: (resolved?.modules ?? []) as unknown[],
				headerModules: wantsHeader ? siteHeaderModules : [],
				footerModules: wantsFooter ? siteFooterModules : [],
				urlAlias: alias,
				useLoginShell: true,
				cmsSlugPrefix: prefix,
				packId
			};
		}

		if (!resolved) {
			throw error(404, 'Page not found');
		}

		return {
			page: resolved.page,
			modules: resolved.modules,
			headerModules: wantsHeader ? siteHeaderModules : [],
			footerModules: wantsFooter ? siteFooterModules : [],
			urlAlias: alias,
			useLoginShell: false,
			cmsSlugPrefix: prefix,
			packId
		};
	} catch (err) {
		if (err && typeof err === 'object' && 'status' in err) {
			throw err;
		}
		throw error(500, 'Failed to load page');
	}
};
