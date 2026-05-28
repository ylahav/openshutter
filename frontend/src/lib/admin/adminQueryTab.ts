import { goto } from '$app/navigation';

/** Parse a search-param enum with fallback when missing or invalid. */
export function parseQueryEnum<T extends string>(
	url: URL,
	param: string,
	allowed: readonly T[],
	fallback: T,
): T {
	const raw = url.searchParams.get(param);
	return raw && (allowed as readonly string[]).includes(raw) ? (raw as T) : fallback;
}

/** Update query string and refresh page state (same pathname, new search). */
export async function pushQuery(
	url: URL,
	updates: Record<string, string | null | undefined>,
	opts?: { invalidateAll?: boolean },
): Promise<void> {
	const next = new URL(url);
	for (const [k, v] of Object.entries(updates)) {
		if (v == null || v === '') next.searchParams.delete(k);
		else next.searchParams.set(k, v);
	}
	const search = next.searchParams.toString();
	const path = search ? `${next.pathname}?${search}` : next.pathname;
	await goto(path, {
		replaceState: true,
		keepFocus: true,
		noScroll: true,
		invalidateAll: opts?.invalidateAll ?? true,
	});
}
