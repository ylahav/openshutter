import { derived } from 'svelte/store';
import { page } from '$app/stores';

/**
 * Reactive view of the current route's SvelteKit load data.
 * In Svelte 5, `$: items = data.items` from `export let data` may not re-render
 * after navigation or invalidate(); subscribing via the page store does.
 */
export function routePageData<T extends Record<string, unknown>>() {
	return derived(page, ($p) => $p.data as T);
}
