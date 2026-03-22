import type { SiteConfig } from '../../types/site-config';
import { MultiLangUtils } from '../../types/multi-lang';

/**
 * Product / site name for emails and server-side templates: optional whiteLabel.productName, then title, then fallbacks.
 */
export function productDisplayNameFromSiteConfig(config: SiteConfig, lang = 'en'): string {
  const pn = config.whiteLabel?.productName;
  if (pn && typeof pn === 'object') {
    const n = MultiLangUtils.getTextValue(pn, lang);
    if (n?.trim()) return n.trim();
  }
  const title = config.title;
  if (title && typeof title === 'object') {
    const t = MultiLangUtils.getTextValue(title, lang);
    if (t?.trim()) return t.trim();
  }
  if (config.whiteLabel?.hideOpenShutterBranding) return 'Site';
  return 'OpenShutter';
}
