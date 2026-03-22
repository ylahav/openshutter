import type { SiteConfig } from '$lib/types/site-config';
import { MultiLangUtils } from '$lib/utils/multiLang';
import type { LanguageCode } from '$lib/types/multi-lang';

/**
 * Product name shown when white-label is enabled or as fallback in headers/footers/titles.
 * When hideOpenShutterBranding is true, never show "OpenShutter"; use site title or "Site".
 */
export function getProductName(config: SiteConfig | null | undefined, lang?: LanguageCode): string {
	if (!config) return 'OpenShutter';
	const langCode = lang ?? (config.languages?.defaultLanguage as LanguageCode | undefined);
	const productOverride = config.whiteLabel?.productName
		? MultiLangUtils.getTextValue(config.whiteLabel.productName, langCode)
		: '';
	if (productOverride && productOverride.trim()) return productOverride.trim();
	const title = config.title ? MultiLangUtils.getTextValue(config.title, langCode) : '';
	if (title && title.trim()) return title.trim();
	return config.whiteLabel?.hideOpenShutterBranding ? 'Site' : 'OpenShutter';
}
