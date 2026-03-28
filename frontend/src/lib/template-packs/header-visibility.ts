/**
 * Per-pack default header chrome when `siteConfig.template.headerConfig` does not override a flag.
 * Site config still wins when an explicit value is set (per-field).
 */
export type PackHeaderId = 'modern' | 'elegant' | 'minimal' | 'default';

export type ResolvedHeaderVisibility = {
	showLogo: boolean;
	showSiteTitle: boolean;
	showMenu: boolean;
	showTemplateSelector: boolean;
	showLanguageSelector: boolean;
	showThemeToggle: boolean;
	showAuthButtons: boolean;
	showGreeting: boolean;
};

const PACK_DEFAULTS: Record<PackHeaderId, ResolvedHeaderVisibility> = {
	/** Logo mark only — navigation chrome hidden unless overridden in site config */
	modern: {
		showLogo: true,
		showSiteTitle: false,
		showMenu: false,
		showTemplateSelector: false,
		showLanguageSelector: false,
		showThemeToggle: false,
		showAuthButtons: false,
		showGreeting: false
	},
	/** Full header */
	elegant: {
		showLogo: true,
		showSiteTitle: true,
		showMenu: true,
		showTemplateSelector: true,
		showLanguageSelector: true,
		showThemeToggle: true,
		showAuthButtons: true,
		showGreeting: true
	},
	/** No inline auth / greeting in header; nav + i18n + theme + template switch */
	minimal: {
		showLogo: true,
		showSiteTitle: true,
		showMenu: true,
		showTemplateSelector: true,
		showLanguageSelector: true,
		showThemeToggle: true,
		showAuthButtons: false,
		showGreeting: false
	},
	default: {
		showLogo: true,
		showSiteTitle: true,
		showMenu: true,
		showTemplateSelector: true,
		showLanguageSelector: true,
		showThemeToggle: true,
		showAuthButtons: true,
		showGreeting: true
	}
};

type HeaderCfg = Record<string, unknown> | undefined | null;

/**
 * Merge site `headerConfig` with built-in defaults for this template pack.
 */
export function resolveHeaderVisibilityForPack(
	packId: PackHeaderId,
	headerConfig: HeaderCfg
): ResolvedHeaderVisibility {
	const base = PACK_DEFAULTS[packId] ?? PACK_DEFAULTS.default;
	const h = headerConfig ?? {};

	const pick = (key: keyof ResolvedHeaderVisibility): boolean => {
		const direct = h[key as string];
		if (direct !== undefined) return Boolean(direct);
		if (key === 'showLanguageSelector') {
			if (h.enableLanguageSelector !== undefined) return Boolean(h.enableLanguageSelector);
		}
		if (key === 'showThemeToggle') {
			if (h.enableThemeToggle !== undefined) return Boolean(h.enableThemeToggle);
		}
		return base[key];
	};

	return {
		showLogo: pick('showLogo'),
		showSiteTitle: pick('showSiteTitle'),
		showMenu: pick('showMenu'),
		showTemplateSelector: pick('showTemplateSelector'),
		showLanguageSelector: pick('showLanguageSelector'),
		showThemeToggle: pick('showThemeToggle'),
		showAuthButtons: pick('showAuthButtons'),
		showGreeting: pick('showGreeting')
	};
}
