/**
 * Curated list of Google Fonts for the theme builder.
 * Family names match CSS font-family and Google Fonts CSS2 API (spaces allowed in name; URL uses +).
 */
export const GOOGLE_FONTS: { value: string; label: string }[] = [
	{ value: 'Inter', label: 'Inter' },
	{ value: 'Roboto', label: 'Roboto' },
	{ value: 'Open Sans', label: 'Open Sans' },
	{ value: 'Lato', label: 'Lato' },
	{ value: 'Montserrat', label: 'Montserrat' },
	{ value: 'Poppins', label: 'Poppins' },
	{ value: 'Source Sans 3', label: 'Source Sans 3' },
	{ value: 'Nunito', label: 'Nunito' },
	{ value: 'Raleway', label: 'Raleway' },
	{ value: 'Oswald', label: 'Oswald' },
	{ value: 'Merriweather', label: 'Merriweather' },
	{ value: 'Playfair Display', label: 'Playfair Display' },
	{ value: 'Cormorant Garamond', label: 'Cormorant Garamond' },
	{ value: 'Jost', label: 'Jost' },
	{ value: 'PT Sans', label: 'PT Sans' },
	{ value: 'Ubuntu', label: 'Ubuntu' },
	{ value: 'DM Sans', label: 'DM Sans' },
	{ value: 'Work Sans', label: 'Work Sans' },
	{ value: 'Fira Sans', label: 'Fira Sans' },
	{ value: 'Libre Franklin', label: 'Libre Franklin' },
	{ value: 'Space Grotesk', label: 'Space Grotesk' },
	{ value: 'Space Mono', label: 'Space Mono' },
	{ value: 'Bebas Neue', label: 'Bebas Neue' },
	{ value: 'Barlow', label: 'Barlow' },
	{ value: 'Manrope', label: 'Manrope' },
	{ value: 'Outfit', label: 'Outfit' },
	{ value: 'Plus Jakarta Sans', label: 'Plus Jakarta Sans' },
	{ value: 'Figtree', label: 'Figtree' },
	{ value: 'Lexend', label: 'Lexend' },
	{ value: 'Crimson Pro', label: 'Crimson Pro' },
	{ value: 'Literata', label: 'Literata' },
	{ value: 'Fraunces', label: 'Fraunces' },
	{ value: 'Sora', label: 'Sora' },
	{ value: 'Geist', label: 'Geist' },
	{ value: 'Instrument Sans', label: 'Instrument Sans' },
	{ value: 'Syne', label: 'Syne' },
	{ value: 'Archivo', label: 'Archivo' },
	{ value: 'Karla', label: 'Karla' },
	{ value: 'Rubik', label: 'Rubik' },
	{ value: 'Quicksand', label: 'Quicksand' },
	{ value: 'Josefin Sans', label: 'Josefin Sans' },
	{ value: 'Noto Sans', label: 'Noto Sans' },
	{ value: 'Noto Serif', label: 'Noto Serif' },
];

/** Set of font family names that we load from Google Fonts (for building the stylesheet URL). */
export const GOOGLE_FONT_NAMES = new Set(GOOGLE_FONTS.map((f) => f.value));

/**
 * Build a Google Fonts CSS2 URL for the given font family names (only includes names in GOOGLE_FONT_NAMES).
 * Weights 400, 600, 700 for headings/body.
 */
export function buildGoogleFontsUrl(fontFamilies: string[]): string | null {
	const names = fontFamilies.filter((name) => name && GOOGLE_FONT_NAMES.has(name));
	if (names.length === 0) return null;
	// CSS2: family=Font+Name:wght@400;600;700
	const params = names
		.map((name) => `family=${encodeURIComponent(name).replace(/%20/g, '+')}:wght@400;600;700`)
		.join('&');
	return `https://fonts.googleapis.com/css2?${params}&display=swap`;
}
