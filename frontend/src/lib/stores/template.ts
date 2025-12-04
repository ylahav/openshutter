import { derived } from 'svelte/store';
import { siteConfigData } from '$stores/siteConfig';

/**
 * Active template name, as configured in siteConfig.template.activeTemplate.
 * Falls back to 'modern' for public pages.
 */
export const activeTemplate = derived(siteConfigData, ($config) => {
  return $config?.template?.activeTemplate || 'modern';
});

