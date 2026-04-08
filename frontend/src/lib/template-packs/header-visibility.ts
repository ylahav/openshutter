/**
 * Per-pack default header chrome when `siteConfig.template.headerConfig` does not override a flag.
 * Site config still wins when an explicit value is set (per-field).
 */
export type PackHeaderId = 'noir' | 'studio' | 'atelier';

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
	noir: {
		showLogo: true,
		showSiteTitle: true,
		showMenu: true,
		showTemplateSelector: true,
		showLanguageSelector: true,
		showThemeToggle: true,
		showAuthButtons: true,
		showGreeting: true
	},
	studio: {
		showLogo: true,
		showSiteTitle: true,
		showMenu: true,
		showTemplateSelector: true,
		showLanguageSelector: true,
		showThemeToggle: true,
		showAuthButtons: true,
		showGreeting: true
	},
	atelier: {
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

/** Legacy DB / old code may still pass removed pack ids. */
const LEGACY_PACK_HEADER: Record<string, PackHeaderId> = {
	default: 'noir',
	minimal: 'noir',
	simple: 'noir',
	modern: 'noir',
	elegant: 'noir'
};

function coercePackHeaderId(packId: string): PackHeaderId {
	const k = String(packId || '').toLowerCase()
	if (k in PACK_DEFAULTS) return k as PackHeaderId
	return LEGACY_PACK_HEADER[k] ?? 'noir'
}

/**
 * Merge site `headerConfig` with built-in defaults for this template pack.
 */
export function resolveHeaderVisibilityForPack(
	packId: string,
	headerConfig: HeaderCfg
): ResolvedHeaderVisibility {
	const id = coercePackHeaderId(packId)
	const base = PACK_DEFAULTS[id]
	const h = headerConfig ?? {}

	const pick = (key: keyof ResolvedHeaderVisibility): boolean => {
		const direct = h[key as string]
		if (direct !== undefined) return Boolean(direct)
		if (key === 'showLanguageSelector') {
			if (h.enableLanguageSelector !== undefined) return Boolean(h.enableLanguageSelector)
		}
		if (key === 'showThemeToggle') {
			if (h.enableThemeToggle !== undefined) return Boolean(h.enableThemeToggle)
		}
		return base[key]
	}

	return {
		showLogo: pick('showLogo'),
		showSiteTitle: pick('showSiteTitle'),
		showMenu: pick('showMenu'),
		showTemplateSelector: pick('showTemplateSelector'),
		showLanguageSelector: pick('showLanguageSelector'),
		showThemeToggle: pick('showThemeToggle'),
		showAuthButtons: pick('showAuthButtons'),
		showGreeting: pick('showGreeting')
	}
}
