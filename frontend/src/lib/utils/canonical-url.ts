/**
 * Absolute URL for `<link rel="canonical">` / `og:url` (pathname + search, no hash).
 * Uses the request URL origin so owner custom domains keep correct SEO signals.
 */
export function canonicalUrlFromPageUrl(url: URL): string {
	return `${url.origin}${url.pathname}${url.search}`;
}

/** Paths that should not be indexed (admin/owner panels). */
export function pathShouldNoindex(pathname: string): boolean {
	return (
		pathname.startsWith('/admin') ||
		pathname.startsWith('/owner') ||
		pathname === '/notifications'
	);
}
