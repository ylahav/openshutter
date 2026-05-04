import { error } from '@sveltejs/kit';
import {
	buildTemplateAwareAliasCandidates,
	resolvePageAliasPrefixes,
	resolveSiteTemplatePack
} from '$lib/utils/template-page-alias';

export async function fetchVisitorSiteConfig(fetch: typeof globalThis.fetch): Promise<unknown> {
	const siteConfigRes = await fetch('/api/site-config');
	const siteConfigJson = siteConfigRes.ok ? await siteConfigRes.json().catch(() => null) : null;
	return siteConfigJson?.success ? siteConfigJson?.data : siteConfigJson;
}

function extractPageFromApiResult(
	result: unknown,
	requirePublished: boolean
): { page: unknown; modules: unknown[] } | null {
	const data = (result as { success?: boolean; data?: unknown } | null)?.success
		? (result as { data: unknown }).data
		: result;
	const page = (data as { page?: unknown } | null)?.page ?? data;
	const modules = Array.isArray((data as { modules?: unknown[] } | null)?.modules)
		? ((data as { modules: unknown[] }).modules ?? [])
		: [];
	if (!page || typeof page !== 'object') return null;
	if (requirePublished && (page as { isPublished?: unknown }).isPublished !== true) {
		return null;
	}
	return { page, modules };
}

async function tryFetchPage(
	fetch: typeof globalThis.fetch,
	url: string,
	requirePublished: boolean
): Promise<{ page: unknown; modules: unknown[] } | null> {
	const response = await fetch(url);
	const result = await response.json().catch(() => null);
	if (!response.ok) {
		if (response.status === 404) return null;
		throw error(
			response.status === 404 ? 404 : 500,
			(result as { error?: string } | null)?.error || 'Page not found'
		);
	}
	return extractPageFromApiResult(result, requirePublished);
}

export type ResolveCmsPublishedPageResult = {
	page: unknown;
	modules: unknown[];
	matchedVia: 'candidate' | 'extra';
	/** Slug that matched for `candidate`, or full URL path+query for `extra`. */
	matchedKey?: string;
};

/**
 * Resolves a published CMS page for one URL path segment (e.g. `about`, `login`).
 *
 * Resolution order (aligned with `/api/pages/[slug]`):
 * 1. Template-prefixed slug when configured (e.g. `s-about`), then plain `alias`.
 * 2. Optional extra API URLs (e.g. `/api/pages/login?role=login&pack=…`) — “normal” product fallbacks when no prefixed/plain row exists.
 *
 * Dedicated SvelteKit routes (`/albums/…`, `/admin`, …) are **not** handled here: they win in the router before this load runs.
 */
export async function resolveCmsPublishedPage(
	fetch: typeof globalThis.fetch,
	options: {
		baseAlias: string;
		siteConfig?: unknown;
		/** Prefer layout `visitorTemplatePack` when set so alias candidates match the active template. */
		packHint?: string | null;
		extraRequests?: readonly string[];
	}
): Promise<ResolveCmsPublishedPageResult | null> {
	const siteConfig =
		options.siteConfig !== undefined && options.siteConfig !== null
			? options.siteConfig
			: await fetchVisitorSiteConfig(fetch);
	const pack =
		(typeof options.packHint === 'string' && options.packHint.trim()
			? options.packHint.trim()
			: undefined) ?? resolveSiteTemplatePack(siteConfig);
	const pageAliasPrefixes = resolvePageAliasPrefixes(siteConfig);
	const candidates = buildTemplateAwareAliasCandidates(options.baseAlias, pack, pageAliasPrefixes);

	for (const slug of candidates) {
		const url = pack
			? `/api/pages/${encodeURIComponent(slug)}?pack=${encodeURIComponent(pack)}`
			: `/api/pages/${encodeURIComponent(slug)}`;
		const parsed = await tryFetchPage(fetch, url, true);
		if (parsed) return { ...parsed, matchedVia: 'candidate', matchedKey: slug };
	}

	/** e.g. `role=login` — match legacy `routes/login` (did not require `isPublished`). */
	for (const url of options.extraRequests ?? []) {
		const parsed = await tryFetchPage(fetch, url, false);
		if (parsed) return { ...parsed, matchedVia: 'extra', matchedKey: url };
	}

	return null;
}

export function loginRoleFallbackRequests(pack: string | undefined): string[] {
	const qs = new URLSearchParams({ role: 'login' });
	if (pack) qs.set('pack', pack);
	return [`/api/pages/login?${qs.toString()}`];
}
