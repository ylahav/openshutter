import { writable, derived } from 'svelte/store';
import type { SiteConfig } from '../types/site-config';

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

	return {
		subscribe,
		load: async () => {
			update((state) => ({ ...state, loading: true, error: null }));
			
			try {
				// Create abort controller for timeout
				const controller = new AbortController();
				const timeoutId = setTimeout(() => controller.abort(), 5000); // 5 second timeout
				
				// Add cache-busting parameter to ensure fresh data
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
				
				// Handle both NestJS (direct data) and Next.js ({success, data}) formats
				const configData = data.success ? data.data : data;
				
				update((state) => ({
					...state,
					config: configData,
					loading: false,
					error: null,
				}));
			} catch (err) {
				// Silently handle network errors - site config is not critical
				const errorMessage = err instanceof Error ? err.message : 'Failed to load site configuration';
				update((state) => ({
					...state,
					loading: false,
					error: errorMessage,
				}));
				// Only log if it's not a network/connection error
				if (!errorMessage.includes('ECONNREFUSED') && !errorMessage.includes('Failed to fetch') && !errorMessage.includes('aborted')) {
					console.error('Error loading site config:', err);
				}
			}
		},
		refetch: async () => {
			await createSiteConfigStore().load();
		},
		reset: () => set(initialState),
	};
}

export const siteConfig = createSiteConfigStore();

// Derived stores for convenience
export const siteConfigData = derived(siteConfig, ($store) => $store.config);
export const siteConfigLoading = derived(siteConfig, ($store) => $store.loading);
export const siteConfigError = derived(siteConfig, ($store) => $store.error);
