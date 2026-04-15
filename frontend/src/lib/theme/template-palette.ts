/**
 * Semantic colors for Template Editor / site_config.template.customColors.
 * Consumed by ThemeColorApplier as `--tp-*` CSS variables for packs (e.g. Noir) and light/dark.
 *
 * @see docs/development/TEMPLATING.md#tokens-palette-and-pack-styles-implementation (palette keys)
 */

/** Core keys (existing editor fields) */
export type TemplateColorCoreKey =
	| 'primary'
	| 'primaryForeground'
	| 'secondary'
	| 'accent'
	| 'background'
	| 'text'
	| 'muted';

/** Extended keys — surfaces, borders, tertiary text (dark theme / default viewer) */
export type TemplateColorExtendedKey =
	| 'surfaceCard'
	| 'surfaceCardSecondary'
	| 'surfaceCardTertiary'
	| 'textSubtle'
	| 'borderSubtle'
	| 'heroStrip'
	| 'footerStrip';

/** Light-theme overrides (when the visitor uses light mode: `html.light`) */
export type TemplateColorLightKey =
	| 'lightBackground'
	| 'lightText'
	| 'lightMuted'
	| 'lightSurfaceCard'
	| 'lightSurfaceCardSecondary'
	| 'lightSurfaceCardTertiary'
	| 'lightTextSubtle'
	| 'lightBorderSubtle'
	| 'lightHeroStrip'
	| 'lightFooterStrip';

export type TemplateCustomColors = Partial<
	Record<TemplateColorCoreKey | TemplateColorExtendedKey | TemplateColorLightKey, string>
>;

const DARK = {
	canvas: '#080808',
	fg: '#f5f5f3',
	fgMuted: 'rgba(245,245,243,0.38)',
	fgSubtle: 'rgba(245,245,243,0.16)',
	s1: '#141414',
	s2: '#1c1c1c',
	s3: '#232323',
	border: 'rgba(255,255,255,0.07)'
} as const;

const LIGHT = {
	canvas: '#f5f5f3',
	fg: '#080808',
	fgMuted: 'rgba(8,8,8,0.45)',
	fgSubtle: 'rgba(8,8,8,0.22)',
	s1: '#e8e8e5',
	s2: '#ddddd9',
	s3: '#d2d2ce',
	border: 'rgba(0,0,0,0.08)'
} as const;

function pick(
	c: Record<string, string | undefined> | null | undefined,
	key: string,
	fallback: string
): string {
	const v = c?.[key];
	return v != null && String(v).trim() !== '' ? String(v).trim() : fallback;
}

/**
 * CSS block defining `--tp-*` tokens for `:root, html.light` and `html.dark`.
 * Uses `customColors` from site config / theme row.
 */
export function buildTemplatePaletteCss(
	customColors: Record<string, string | undefined> | null | undefined
): string {
	const c = customColors ?? {};

	const lightCanvas = pick(c, 'lightBackground', LIGHT.canvas);
	const lightFg = pick(c, 'lightText', LIGHT.fg);
	const lightMuted = pick(c, 'lightMuted', LIGHT.fgMuted);
	const lightSubtle = pick(c, 'lightTextSubtle', LIGHT.fgSubtle);
	const lightS1 = pick(c, 'lightSurfaceCard', LIGHT.s1);
	const lightS2 = pick(c, 'lightSurfaceCardSecondary', LIGHT.s2);
	const lightS3 = pick(c, 'lightSurfaceCardTertiary', LIGHT.s3);
	const lightBorder = pick(c, 'lightBorderSubtle', LIGHT.border);
	const lightHeroStrip = pick(c, 'lightHeroStrip', '#0f172a');
	const lightFooterStrip = pick(c, 'lightFooterStrip', '#0f172a');

	const darkCanvas = pick(c, 'background', DARK.canvas);
	const darkFg = pick(c, 'text', DARK.fg);
	const darkMuted = pick(c, 'muted', DARK.fgMuted);
	const darkSubtle = pick(c, 'textSubtle', DARK.fgSubtle);
	const darkS1 = pick(c, 'surfaceCard', DARK.s1);
	const darkS2 = pick(c, 'surfaceCardSecondary', DARK.s2);
	const darkS3 = pick(c, 'surfaceCardTertiary', DARK.s3);
	const darkBorder = pick(c, 'borderSubtle', DARK.border);
	const darkHeroStrip = pick(c, 'heroStrip', '#020617');
	const darkFooterStrip = pick(c, 'footerStrip', '#020617');

	const lightFaint = pick(c, 'lightTextFaint', lightSubtle);
	const darkFaint = pick(c, 'textFaint', darkSubtle);

	const lightHeaderBg = pick(c, 'lightHeaderBackground', lightCanvas);
	const darkHeaderBg = pick(c, 'headerBackground', darkCanvas);
	const lightHeaderBorder = pick(c, 'lightHeaderBorder', lightBorder);
	const darkHeaderBorder = pick(c, 'headerBorder', darkBorder);

	const lightCardBorder = pick(c, 'lightCardBorder', lightBorder);
	const darkCardBorder = pick(c, 'cardBorder', darkBorder);

	/** Brand / CTA — optional per-mode overrides (`lightPrimary` / `lightSecondary` / `lightAccent`). */
	const lightBrand = pick(c, 'lightPrimary', pick(c, 'primary', '#2563eb'));
	const darkBrand = pick(c, 'primary', lightBrand);
	const lightBrandHover = pick(c, 'lightSecondary', pick(c, 'secondary', lightBrand));
	const darkBrandHover = pick(c, 'secondary', darkBrand);
	const lightAccent = pick(c, 'lightAccent', pick(c, 'accent', lightBrand));
	const darkAccent = pick(c, 'accent', darkBrand);
	const onBrand = pick(c, 'primaryForeground', '#ffffff');

	const lightHeroFilter = pick(c, 'lightHeroImageFilter', 'brightness(0.55) saturate(0.8)');
	const darkHeroFilter = pick(c, 'heroImageFilter', 'brightness(0.35) saturate(0.6)');
	const lightLoginFilter = pick(
		c,
		'lightLoginBgFilter',
		'brightness(0.3) saturate(0.4) sepia(0.3)'
	);
	const darkLoginFilter = pick(
		c,
		'loginBgFilter',
		'brightness(0.15) saturate(0.3) sepia(0.4)'
	);

	return `
:root, html.light {
  --tp-canvas: ${lightCanvas};
  --tp-fg: ${lightFg};
  --tp-fg-muted: ${lightMuted};
  --tp-fg-subtle: ${lightSubtle};
  --tp-fg-faint: ${lightFaint};
  --tp-surface-1: ${lightS1};
  --tp-surface-2: ${lightS2};
  --tp-surface-3: ${lightS3};
  --tp-border: ${lightBorder};
  --tp-card-border: ${lightCardBorder};
  --tp-header-bg: ${lightHeaderBg};
  --tp-header-border: ${lightHeaderBorder};
  --tp-hero-strip-bg: ${lightHeroStrip};
  --tp-footer-strip-bg: ${lightFooterStrip};
  --tp-brand: ${lightBrand};
  --tp-brand-hover: ${lightBrandHover};
  --tp-accent: ${lightAccent};
  --tp-on-brand: ${onBrand};
  --tp-overlay-scrim: rgba(0,0,0,0.5);
  --tp-hero-grid-opacity: 0.12;
  --os-hero-image-filter: ${lightHeroFilter};
  --os-login-bg-filter: ${lightLoginFilter};
}
html.dark {
  --tp-canvas: ${darkCanvas};
  --tp-fg: ${darkFg};
  --tp-fg-muted: ${darkMuted};
  --tp-fg-subtle: ${darkSubtle};
  --tp-fg-faint: ${darkFaint};
  --tp-surface-1: ${darkS1};
  --tp-surface-2: ${darkS2};
  --tp-surface-3: ${darkS3};
  --tp-border: ${darkBorder};
  --tp-card-border: ${darkCardBorder};
  --tp-header-bg: ${darkHeaderBg};
  --tp-header-border: ${darkHeaderBorder};
  --tp-hero-strip-bg: ${darkHeroStrip};
  --tp-footer-strip-bg: ${darkFooterStrip};
  --tp-brand: ${darkBrand};
  --tp-brand-hover: ${darkBrandHover};
  --tp-accent: ${darkAccent};
  --tp-on-brand: ${onBrand};
  --tp-overlay-scrim: rgba(0,0,0,0.7);
  --tp-hero-grid-opacity: 0.18;
  --os-hero-image-filter: ${darkHeroFilter};
  --os-login-bg-filter: ${darkLoginFilter};
}
`.trim();
}

/** Default hex/rgba map for admin color pickers (extended + light). */
export const DEFAULT_TEMPLATE_COLOR_EXTENDED: Record<string, string> = {
	surfaceCard: DARK.s1,
	surfaceCardSecondary: DARK.s2,
	surfaceCardTertiary: DARK.s3,
	textSubtle: DARK.fgSubtle,
	borderSubtle: DARK.border,
	lightBackground: LIGHT.canvas,
	lightText: LIGHT.fg,
	lightMuted: LIGHT.fgMuted,
	lightSurfaceCard: LIGHT.s1,
	lightSurfaceCardSecondary: LIGHT.s2,
	lightSurfaceCardTertiary: LIGHT.s3,
	lightTextSubtle: LIGHT.fgSubtle,
	lightBorderSubtle: LIGHT.border,
	heroStrip: '#020617',
	footerStrip: '#020617',
	lightHeroStrip: '#0f172a',
	lightFooterStrip: '#0f172a'
};

/** Labels for Template Overrides UI (English; i18n can be layered later). */
export const EXTENDED_COLOR_FIELD_META: Array<{
	key: string;
	label: string;
	description: string;
	group: 'surfaces' | 'light' | 'strips';
}> = [
	{
		key: 'surfaceCard',
		label: 'Surface — card (elevated)',
		description: 'Album tiles, panels, hero grid cells — primary elevated surface.',
		group: 'surfaces'
	},
	{
		key: 'surfaceCardSecondary',
		label: 'Surface — secondary',
		description: 'Second tier surfaces (alternate grid / cards).',
		group: 'surfaces'
	},
	{
		key: 'surfaceCardTertiary',
		label: 'Surface — tertiary',
		description: 'Third tier surface variation.',
		group: 'surfaces'
	},
	{
		key: 'textSubtle',
		label: 'Text — tertiary',
		description: 'Very subtle labels (scroll hint, page indicator). Uses rgba or hex.',
		group: 'surfaces'
	},
	{
		key: 'borderSubtle',
		label: 'Border — subtle',
		description: 'Hairlines: header rule, section borders, footer.',
		group: 'surfaces'
	},
	{
		key: 'heroStrip',
		label: 'Hero / dark band (dark theme)',
		description: 'Background for Studio-style hero and matching footer strip when the visitor uses dark theme.',
		group: 'strips'
	},
	{
		key: 'footerStrip',
		label: 'Footer band (dark theme)',
		description: 'Footer background in dark theme (defaults to hero strip if unset).',
		group: 'strips'
	},
	{
		key: 'lightBackground',
		label: 'Light mode — canvas',
		description: 'Page background when the visitor uses light theme.',
		group: 'light'
	},
	{
		key: 'lightText',
		label: 'Light mode — text',
		description: 'Primary text color in light theme.',
		group: 'light'
	},
	{
		key: 'lightMuted',
		label: 'Light mode — muted text',
		description: 'Secondary text (nav, section labels) in light theme.',
		group: 'light'
	},
	{
		key: 'lightSurfaceCard',
		label: 'Light mode — surface card',
		description: 'Elevated surfaces in light theme.',
		group: 'light'
	},
	{
		key: 'lightSurfaceCardSecondary',
		label: 'Light mode — surface secondary',
		description: 'Second tier surfaces in light theme.',
		group: 'light'
	},
	{
		key: 'lightSurfaceCardTertiary',
		label: 'Light mode — surface tertiary',
		description: 'Third tier surfaces in light theme.',
		group: 'light'
	},
	{
		key: 'lightTextSubtle',
		label: 'Light mode — text tertiary',
		description: 'Subtle text in light theme.',
		group: 'light'
	},
	{
		key: 'lightBorderSubtle',
		label: 'Light mode — border',
		description: 'Borders and dividers in light theme.',
		group: 'light'
	},
	{
		key: 'lightHeroStrip',
		label: 'Hero / dark band (light theme)',
		description: 'Dark hero/footer strip when the visitor uses light theme (Studio pack).',
		group: 'light'
	},
	{
		key: 'lightFooterStrip',
		label: 'Footer band (light theme)',
		description: 'Footer background in light theme (defaults to hero strip if unset).',
		group: 'light'
	}
];
