import { writable, derived } from 'svelte/store';
import type { SiteConfig } from '../types/site-config';
import { logger } from '../utils/logger';

interface SiteConfigState {
	config: SiteConfig | null;
	loading: boolean;
	error: string | null;
}

const initialState: SiteConfigState = {
	config: null,
	loading: true,
	error: null,
};

function createSiteConfigStore() {
	const { subscribe, set, update } = writable<SiteConfigState>(initialState);

	/** Seed store from SSR layout load so `activeTemplate` and theme applier match before `load()` finishes. */
	function hydrateFromServer(config: SiteConfig) {
		update((state) => ({
			...state,
			config,
			loading: false,
			error: null
		}));
	}

	async function load() {
		update((state) => ({ ...state, loading: true, error: null }));

		try {
			const controller = new AbortController();
			const timeoutId = setTimeout(() => controller.abort(), 5000);

			const cacheBuster = `?t=${Date.now()}`;
			const response = await fetch(`/api/site-config${cacheBuster}`, {
				signal: controller.signal,
				cache: 'no-store',
			});

			clearTimeout(timeoutId);

			if (!response.ok) {
				throw new Error(`HTTP ${response.status}: ${response.statusText}`);
			}

			const data = await response.json();

			const configData = data.success ? data.data : data;

			update((state) => ({
				...state,
				config: configData,
				loading: false,
				error: null,
			}));
		} catch (err) {
			const errorMessage = err instanceof Error ? err.message : 'Failed to load site configuration';
			update((state) => ({
				...state,
				loading: false,
				error: errorMessage,
			}));
			if (
				!errorMessage.includes('ECONNREFUSED') &&
				!errorMessage.includes('Failed to fetch') &&
				!errorMessage.includes('aborted')
			) {
				logger.error('Error loading site config:', err);
			}
		}
	}

	return {
		subscribe,
		hydrateFromServer,
		load,
		refetch: load,
		reset: () => set(initialState),
	};
}

export const siteConfig = createSiteConfigStore();

export const siteConfigData = derived(siteConfig, ($store) => $store.config);
export const siteConfigLoading = derived(siteConfig, ($store) => $store.loading);
export const siteConfigError = derived(siteConfig, ($store) => $store.error);
