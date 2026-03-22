import type { SiteConfig } from '$lib/types/site-config';

/** Public site header / page-builder logo: white-label override, else global `logo`. */
export function getPublicLogo(config: SiteConfig | null | undefined): string {
	if (!config) return '';
	const w = config.whiteLabel?.logo?.trim();
	if (w) return w;
	return config.logo?.trim() ?? '';
}

/** Browser favicon: white-label override, else global `favicon`. */
export function getPublicFavicon(config: SiteConfig | null | undefined): string {
	if (!config) return '';
	const w = config.whiteLabel?.favicon?.trim();
	if (w) return w;
	return config.favicon?.trim() ?? '';
}
