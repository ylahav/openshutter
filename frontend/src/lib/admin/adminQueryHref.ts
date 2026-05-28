/** Build same-page admin URLs with query params (use on `<a href>` for reliable tab switches in Svelte 5). */
export function adminQueryHref(
	pathname: string,
	params: Record<string, string | null | undefined>,
): string {
	const url = new URL(pathname, 'http://localhost');
	for (const [key, value] of Object.entries(params)) {
		if (value == null || value === '') url.searchParams.delete(key);
		else url.searchParams.set(key, value);
	}
	const search = url.searchParams.toString();
	return search ? `${url.pathname}?${search}` : url.pathname;
}
