import { writable, type Writable } from 'svelte/store';

/**
 * Svelte 5–safe loading flag for templates: use `{#if $loading}`, not `{#if loading}`.
 */
export function createLoading(initial = false): Writable<boolean> {
	return writable(initial);
}
