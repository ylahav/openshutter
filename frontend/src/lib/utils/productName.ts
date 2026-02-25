import type { SiteConfig } from '$lib/types/site-config';
import { MultiLangUtils } from '$lib/utils/multiLang';
import type { LanguageCode } from '$lib/types/multi-lang';

/**
 * Product name shown when white-label is enabled or as fallback in headers/footers/titles.
 * When hideOpenShutterBranding is true, never show "OpenShutter"; use site title or "Site".
 */
export function getProductName(config: SiteConfig | null | undefined, lang?: LanguageCode): string {
	if (!config) return 'OpenShutter';
	const title = config.title ? MultiLangUtils.getTextValue(config.title, lang) : '';
	if (title && title.trim()) return title.trim();
	return config.whiteLabel?.hideOpenShutterBranding ? 'Site' : 'OpenShutter';
}
