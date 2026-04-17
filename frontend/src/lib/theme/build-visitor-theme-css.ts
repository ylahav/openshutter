import type { SiteConfig } from '$lib/types/site-config';
import {
	FONT_ROLES,
	getFontFamily,
	normalizeFontSetting,
	type FontRole,
	type FontSetting
} from '$lib/types/fonts';
import {
	BREAKPOINT_MIN_WIDTH_PX,
	TEMPLATE_BREAKPOINTS,
	seedShellFromDb,
	buildShellLayoutCssVars
} from '$lib/template/breakpoints';
import { buildTemplatePaletteCss } from '$lib/template/theme/template-palette';
import { mergePackColorsWithCustom, getPackThemeDefaultFonts } from '$lib/template/pack-theme-defaults';
import { resolveVisitorTemplatePackId, type PageDataForPack } from '$lib/template-packs/resolve-visitor-pack';
import type { TemplatePackId } from '$lib/template/packs/ids';

function buildShellRootVars(config: SiteConfig | null | undefined): string {
	const shellByBp = seedShellFromDb(
		config?.template?.customLayout,
		config?.template?.customLayoutByBreakpoint
	);
	return buildShellLayoutCssVars(shellByBp.xs);
}

function buildShellMediaQueries(config: SiteConfig | null | undefined): string {
	const shellByBp = seedShellFromDb(
		config?.template?.customLayout,
		config?.template?.customLayoutByBreakpoint
	);
	let css = '';
	for (const bp of TEMPLATE_BREAKPOINTS) {
		if (bp === 'xs') continue;
		const shell = shellByBp[bp];
		css += `@media (min-width: ${BREAKPOINT_MIN_WIDTH_PX[bp]}px) {\n`;
		css += `  :root {\n`;
		css +=
			buildShellLayoutCssVars(shell)
				.split('\n')
				.filter((l) => l.trim() !== '')
				.map((l) => `    ${l.trim()}`)
				.join('\n') + '\n';
		css += `  }\n`;
		css += `}\n`;
	}
	return css;
}

function effectiveFontRaw(
	packId: TemplatePackId,
	template: SiteConfig['template'] | null | undefined,
	role: FontRole
): string | FontSetting | undefined {
	const custom = template?.customFonts?.[role];
	if (custom !== undefined && custom !== null) {
		if (typeof custom === 'string') {
			if (custom.trim() !== '') return custom;
		} else if (typeof custom === 'object' && String(custom.family ?? '').trim() !== '') {
			return custom;
		}
	}
	return getPackThemeDefaultFonts(packId)[role];
}

/**
 * Full visitor theme stylesheet: `--tp-*`, legacy `--os-*`, fonts, shell layout, Tailwind bridges.
 * Used by ThemeColorApplier (client) and SSR `<style>` in `+layout`.
 */
export function buildVisitorThemeStylesheet(
	siteConfig: SiteConfig | null | undefined,
	pathname: string,
	pageData: PageDataForPack
): string {
	const packId = resolveVisitorTemplatePackId(pathname, siteConfig, pageData);
	const customColors = siteConfig?.template?.customColors;
	const template = siteConfig?.template;
	const mergedColors = mergePackColorsWithCustom(packId, customColors);

	let cssVars = `${buildTemplatePaletteCss(mergedColors)}\n\n:root {\n`;

	if (mergedColors.primary) {
		cssVars += `  --os-primary: ${mergedColors.primary};\n`;
		cssVars += `  --color-primary: ${mergedColors.primary};\n`;
		cssVars += `  --color-primary-600: ${mergedColors.primary};\n`;
		cssVars += `  --color-primary-700: ${mergedColors.primary};\n`;
		cssVars += `  --color-primary-500: ${mergedColors.primary};\n`;
	}
	if (mergedColors.secondary) {
		cssVars += `  --os-secondary: ${mergedColors.secondary};\n`;
		cssVars += `  --color-secondary: ${mergedColors.secondary};\n`;
	}
	if (mergedColors.accent) {
		cssVars += `  --os-accent: ${mergedColors.accent};\n`;
		cssVars += `  --color-accent: ${mergedColors.accent};\n`;
	}
	if (mergedColors.background) cssVars += `  --os-background: ${mergedColors.background};\n`;
	if (mergedColors.text) cssVars += `  --os-text: ${mergedColors.text};\n`;
	if (mergedColors.muted) cssVars += `  --os-muted: ${mergedColors.muted};\n`;

	for (const role of FONT_ROLES) {
		const raw = effectiveFontRaw(packId, template, role);
		const family = getFontFamily(raw);
		if (!family) continue;
		const normalized = normalizeFontSetting(raw, family, role);
		const varName =
			role === 'formInputs' ? 'form-inputs' : role === 'formLabels' ? 'form-labels' : role;
		const quotedFamily = normalized.family.includes(' ') ? `"${normalized.family}"` : normalized.family;
		cssVars += `  --os-font-${varName}: ${quotedFamily}, sans-serif;\n`;
		cssVars += `  --os-font-${varName}-size: ${normalized.size ?? 'inherit'};\n`;
		cssVars += `  --os-font-${varName}-weight: ${normalized.weight ?? 'inherit'};\n`;
	}

	cssVars += buildShellRootVars(siteConfig);
	cssVars += '}\n';
	cssVars += buildShellMediaQueries(siteConfig);

	cssVars += 'html.dark {\n';
	if (mergedColors.primary) {
		cssVars += `  --os-primary: ${mergedColors.primary};\n`;
		cssVars += `  --color-primary: ${mergedColors.primary};\n`;
		cssVars += `  --color-primary-600: ${mergedColors.primary};\n`;
		cssVars += `  --color-primary-700: ${mergedColors.primary};\n`;
		cssVars += `  --color-primary-500: ${mergedColors.primary};\n`;
	}
	if (mergedColors.secondary) {
		cssVars += `  --os-secondary: ${mergedColors.secondary};\n`;
		cssVars += `  --color-secondary: ${mergedColors.secondary};\n`;
	}
	if (mergedColors.accent) {
		cssVars += `  --os-accent: ${mergedColors.accent};\n`;
		cssVars += `  --color-accent: ${mergedColors.accent};\n`;
	}
	if (mergedColors.background) {
		cssVars += `  --os-background: ${mergedColors.background};\n`;
		cssVars += `  --color-background: ${mergedColors.background};\n`;
	}
	if (mergedColors.text) {
		cssVars += `  --os-text: ${mergedColors.text};\n`;
		cssVars += `  --color-foreground: ${mergedColors.text};\n`;
	}
	if (mergedColors.muted) {
		cssVars += `  --os-muted: ${mergedColors.muted};\n`;
		cssVars += `  --color-muted: ${mergedColors.muted};\n`;
	}
	cssVars += '}\n';

	if (mergedColors.primary) {
		cssVars += `[class*="bg-primary-600"], [class*="bg-primary-700"], [class*="bg-primary-500"] { background-color: ${mergedColors.primary} !important; }\n`;
		cssVars += `.bg-primary-600, .bg-primary-700, .bg-primary-500 { background-color: ${mergedColors.primary} !important; }\n`;
		cssVars += `[class*="text-primary-600"], [class*="text-primary-700"], [class*="text-primary-500"], [class*="text-primary"] { color: ${mergedColors.primary} !important; }\n`;
		cssVars += `.text-primary-600, .text-primary-700, .text-primary-500, .text-primary { color: ${mergedColors.primary} !important; }\n`;
		cssVars += `[class*="border-primary-600"], [class*="border-primary-500"] { border-color: ${mergedColors.primary} !important; }\n`;
		cssVars += `.border-primary-600, .border-primary-500 { border-color: ${mergedColors.primary} !important; }\n`;
		cssVars += `[class*="ring-primary-500"] { --tw-ring-color: ${mergedColors.primary} !important; }\n`;
		cssVars += `.ring-primary-500 { --tw-ring-color: ${mergedColors.primary} !important; }\n`;
		cssVars += `[class*="hover:bg-primary-700"]:hover { background-color: ${mergedColors.primary} !important; opacity: 0.9; }\n`;
		cssVars += `.hover\\:bg-primary-700:hover { background-color: ${mergedColors.primary} !important; opacity: 0.9; }\n`;
	}

	if (mergedColors.text) {
		cssVars += `body, main, .text-gray-900, .text-gray-800, .text-gray-700, .text-black { color: ${mergedColors.text} !important; }\n`;
		cssVars += `html.dark body, html.dark main, html.dark .text-gray-900, html.dark .text-gray-800, html.dark .text-gray-700, html.dark .text-black { color: ${mergedColors.text} !important; }\n`;
		cssVars += `p, span, div, h1, h2, h3, h4, h5, h6, a:not([class*="text-"]) { color: ${mergedColors.text}; }\n`;
		cssVars += `html.dark p, html.dark span, html.dark div, html.dark h1, html.dark h2, html.dark h3, html.dark h4, html.dark h5, html.dark h6, html.dark a:not([class*="text-"]) { color: ${mergedColors.text}; }\n`;
	}
	if (mergedColors.background) {
		cssVars += `body { background-color: ${mergedColors.background} !important; }\n`;
		cssVars += `html.dark body { background-color: ${mergedColors.background} !important; }\n`;
	}

	return cssVars;
}

export function visitorThemeGoogleFontFamilies(
	siteConfig: SiteConfig | null | undefined,
	pathname: string,
	pageData: PageDataForPack
): string[] {
	const packId = resolveVisitorTemplatePackId(pathname, siteConfig, pageData);
	const template = siteConfig?.template;
	return FONT_ROLES.map((role) => getFontFamily(effectiveFontRaw(packId, template, role))).filter(
		(name): name is string => Boolean(name)
	);
}
