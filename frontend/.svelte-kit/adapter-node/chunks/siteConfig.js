import { d as derived, w as writable } from "./index.js";
const initialState = {
  config: null,
  loading: true,
  error: null
};
function createSiteConfigStore() {
  const { subscribe, set, update } = writable(initialState);
  return {
    subscribe,
    load: async () => {
      update((state) => ({ ...state, loading: true, error: null }));
      try {
        const controller = new AbortController();
        const timeoutId = setTimeout(() => controller.abort(), 5e3);
        const response = await fetch("/api/site-config", {
          signal: controller.signal
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
          error: null
        }));
      } catch (err) {
        const errorMessage = err instanceof Error ? err.message : "Failed to load site configuration";
        update((state) => ({
          ...state,
          loading: false,
          error: errorMessage
        }));
        if (!errorMessage.includes("ECONNREFUSED") && !errorMessage.includes("Failed to fetch") && !errorMessage.includes("aborted")) {
          console.error("Error loading site config:", err);
        }
      }
    },
    refetch: async () => {
      await createSiteConfigStore().load();
    },
    reset: () => set(initialState)
  };
}
const siteConfig = createSiteConfigStore();
const siteConfigData = derived(siteConfig, ($store) => $store.config);
derived(siteConfig, ($store) => $store.loading);
derived(siteConfig, ($store) => $store.error);
export {
  siteConfigData as s
};
