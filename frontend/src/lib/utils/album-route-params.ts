/**
 * Gallery album slug from route params.
 * - `/albums/{slug}` → `alias` is the slug (`routes/albums/[alias]`).
 * - `/[shell]/{slug}` (e.g. `/album/2026-05-01`) → slug is `param`; `alias` is the shell (`routes/[alias]/[param]`).
 */
export function albumSlugFromRouteParams(
	params: Record<string, string | undefined> | undefined
): string | undefined {
	if (!params) return undefined;
	const fromParam = params.param?.trim();
	if (fromParam) return fromParam;
	const a = params.albumAlias?.trim() || params.alias?.trim() || params.id?.trim();
	return a || undefined;
}

const PACK_ALBUM_SHELL_ALIASES = new Set(['album', 'albums', 'gallery']);

/** First URL segment uses the pack `Album.svelte` shell when there is no CMS row. */
export function isPackAlbumShellRoute(urlAlias: string | undefined): boolean {
	if (!urlAlias) return false;
	return PACK_ALBUM_SHELL_ALIASES.has(urlAlias.toLowerCase());
}
