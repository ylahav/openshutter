import { writable } from 'svelte/store';
import { browser } from '$app/environment';

export type AdminUiColorMode = 'light' | 'dark';

const STORAGE_KEY = 'admin-ui-color-mode';

function readStored(): AdminUiColorMode {
	if (!browser) return 'light';
	const v = localStorage.getItem(STORAGE_KEY);
	if (v === 'dark' || v === 'light') return v;
	return 'light';
}

export const adminUiColorMode = writable<AdminUiColorMode>(readStored());

if (browser) {
	adminUiColorMode.subscribe((mode) => {
		localStorage.setItem(STORAGE_KEY, mode);
	});
}

export function toggleAdminUiColorMode() {
	adminUiColorMode.update((m) => (m === 'light' ? 'dark' : 'light'));
}
