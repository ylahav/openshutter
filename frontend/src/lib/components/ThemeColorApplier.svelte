<!-- Apply custom theme colors as CSS variables -->
<script lang="ts">
	import { onMount, onDestroy } from 'svelte';
	import { siteConfigData } from '$stores/siteConfig';
	import { resolvedTheme } from '$lib/stores/theme';
	import { browser } from '$app/environment';
	import { buildGoogleFontsUrl } from '$lib/constants/google-fonts';
	import { FONT_ROLES, getFontFamily, normalizeFontSetting } from '$lib/types/fonts';
	import {
		BREAKPOINT_MIN_WIDTH_PX,
		TEMPLATE_BREAKPOINTS,
		seedShellFromDb,
		buildShellLayoutCssVars
	} from '$lib/template/breakpoints';
	import { buildTemplatePaletteCss } from '$lib/theme/template-palette';

	let styleElement: HTMLStyleElement | null = null;
	let googleFontsLink: HTMLLinkElement | null = null;

	function applyGoogleFontsLink(fontFamilies: string[]) {
		if (!browser || !document.head) return;
		const url = buildGoogleFontsUrl(fontFamilies);
		if (googleFontsLink && googleFontsLink.parentNode) {
			googleFontsLink.parentNode.removeChild(googleFontsLink);
			googleFontsLink = null;
		}
		if (url) {
			googleFontsLink = document.createElement('link');
			googleFontsLink.id = 'theme-google-fonts';
			googleFontsLink.rel = 'stylesheet';
			googleFontsLink.href = url;
			document.head.appendChild(googleFontsLink);
		}
	}

	function buildShellRootVars(config: any): string {
		const shellByBp = seedShellFromDb(
			config?.template?.customLayout,
			config?.template?.customLayoutByBreakpoint
		);
		return buildShellLayoutCssVars(shellByBp.xs);
	}

	function buildShellMediaQueries(config: any): string {
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

	function applyCustomColors() {
		if (!browser) return;
		
		const config = $siteConfigData;
		const customColors = config?.template?.customColors;
		const customFonts = config?.template?.customFonts;

		// Inject Google Fonts stylesheet: collect family from each role (string or FontSetting)
		const fontFamilies = FONT_ROLES.map((role) => getFontFamily(customFonts?.[role])).filter(
			(name): name is string => Boolean(name)
		);
		applyGoogleFontsLink(fontFamilies);

		// Remove existing style element if it exists to ensure fresh application
		if (styleElement && styleElement.parentNode) {
			styleElement.parentNode.removeChild(styleElement);
			styleElement = null;
		}

		// Create style element and append at the end of head to ensure it overrides other styles
		styleElement = document.createElement('style');
		styleElement.id = 'theme-custom-colors';
		// Insert at the end of head to ensure it loads after Tailwind styles
		document.head.appendChild(styleElement);

		// Semantic template palette (--tp-*) for packs (Noir, etc.) + light/dark
		let cssVars = `${buildTemplatePaletteCss(customColors as Record<string, string | undefined>)}\n\n:root {\n`;
		
		if (customColors) {
			if (customColors.primary) {
				cssVars += `  --os-primary: ${customColors.primary};\n`;
				// Map to Tailwind primary colors so bg-primary-600 etc. use the custom color
				cssVars += `  --color-primary: ${customColors.primary};\n`;
				cssVars += `  --color-primary-600: ${customColors.primary};\n`;
				cssVars += `  --color-primary-700: ${customColors.primary};\n`;
				cssVars += `  --color-primary-500: ${customColors.primary};\n`;
			}
			if (customColors.secondary) {
				cssVars += `  --os-secondary: ${customColors.secondary};\n`;
				cssVars += `  --color-secondary: ${customColors.secondary};\n`;
			}
			if (customColors.accent) {
				cssVars += `  --os-accent: ${customColors.accent};\n`;
				cssVars += `  --color-accent: ${customColors.accent};\n`;
			}
			if (customColors.background) cssVars += `  --os-background: ${customColors.background};\n`;
			if (customColors.text) cssVars += `  --os-text: ${customColors.text};\n`;
			if (customColors.muted) cssVars += `  --os-muted: ${customColors.muted};\n`;
		}

		if (customFonts) {
			for (const role of FONT_ROLES) {
				const raw = customFonts[role];
				const family = getFontFamily(raw);
				if (!family) continue;
				const normalized = normalizeFontSetting(raw, family, role);
				const varName = role === 'formInputs' ? 'form-inputs' : role === 'formLabels' ? 'form-labels' : role;
				// Quote font family so multi-word names (e.g. "Playfair Display") are valid in CSS
				const quotedFamily = normalized.family.includes(' ') ? `"${normalized.family}"` : normalized.family;
				cssVars += `  --os-font-${varName}: ${quotedFamily}, sans-serif;\n`;
				cssVars += `  --os-font-${varName}-size: ${normalized.size ?? 'inherit'};\n`;
				cssVars += `  --os-font-${varName}-weight: ${normalized.weight ?? 'inherit'};\n`;
			}
		}

		cssVars += buildShellRootVars(config);
		cssVars += '}\n';
		cssVars += buildShellMediaQueries(config);

		// Apply same custom colors to dark mode as well
		if (customColors) {
			cssVars += 'html.dark {\n';
			if (customColors.primary) {
				cssVars += `  --os-primary: ${customColors.primary};\n`;
				cssVars += `  --color-primary: ${customColors.primary};\n`;
				cssVars += `  --color-primary-600: ${customColors.primary};\n`;
				cssVars += `  --color-primary-700: ${customColors.primary};\n`;
				cssVars += `  --color-primary-500: ${customColors.primary};\n`;
			}
			if (customColors.secondary) {
				cssVars += `  --os-secondary: ${customColors.secondary};\n`;
				cssVars += `  --color-secondary: ${customColors.secondary};\n`;
			}
			if (customColors.accent) {
				cssVars += `  --os-accent: ${customColors.accent};\n`;
				cssVars += `  --color-accent: ${customColors.accent};\n`;
			}
			if (customColors.background) {
				cssVars += `  --os-background: ${customColors.background};\n`;
				cssVars += `  --color-background: ${customColors.background};\n`;
			}
			if (customColors.text) {
				cssVars += `  --os-text: ${customColors.text};\n`;
				cssVars += `  --color-foreground: ${customColors.text};\n`;
			}
			if (customColors.muted) {
				cssVars += `  --os-muted: ${customColors.muted};\n`;
				cssVars += `  --color-muted: ${customColors.muted};\n`;
			}
			cssVars += '}\n';
		}

		// Override Tailwind primary color classes to use custom primary color
		// Use high specificity and !important to ensure these override Tailwind's generated classes
		if (customColors?.primary) {
			cssVars += `[class*="bg-primary-600"], [class*="bg-primary-700"], [class*="bg-primary-500"] { background-color: ${customColors.primary} !important; }\n`;
			cssVars += `.bg-primary-600, .bg-primary-700, .bg-primary-500 { background-color: ${customColors.primary} !important; }\n`;
			cssVars += `[class*="text-primary-600"], [class*="text-primary-700"], [class*="text-primary-500"], [class*="text-primary"] { color: ${customColors.primary} !important; }\n`;
			cssVars += `.text-primary-600, .text-primary-700, .text-primary-500, .text-primary { color: ${customColors.primary} !important; }\n`;
			cssVars += `[class*="border-primary-600"], [class*="border-primary-500"] { border-color: ${customColors.primary} !important; }\n`;
			cssVars += `.border-primary-600, .border-primary-500 { border-color: ${customColors.primary} !important; }\n`;
			cssVars += `[class*="ring-primary-500"] { --tw-ring-color: ${customColors.primary} !important; }\n`;
			cssVars += `.ring-primary-500 { --tw-ring-color: ${customColors.primary} !important; }\n`;
			cssVars += `[class*="hover:bg-primary-700"]:hover { background-color: ${customColors.primary} !important; opacity: 0.9; }\n`;
			cssVars += `.hover\\:bg-primary-700:hover { background-color: ${customColors.primary} !important; opacity: 0.9; }\n`;
		}

		// Apply to body and main elements for immediate effect
		// Use !important to override template-specific styles
		// Apply to both light and dark modes
		if (customColors?.text) {
			cssVars += `body, main, .text-gray-900, .text-gray-800, .text-gray-700, .text-black { color: ${customColors.text} !important; }\n`;
			cssVars += `html.dark body, html.dark main, html.dark .text-gray-900, html.dark .text-gray-800, html.dark .text-gray-700, html.dark .text-black { color: ${customColors.text} !important; }\n`;
			// Also apply to common text elements
			cssVars += `p, span, div, h1, h2, h3, h4, h5, h6, a:not([class*="text-"]) { color: ${customColors.text}; }\n`;
			cssVars += `html.dark p, html.dark span, html.dark div, html.dark h1, html.dark h2, html.dark h3, html.dark h4, html.dark h5, html.dark h6, html.dark a:not([class*="text-"]) { color: ${customColors.text}; }\n`;
		}
		// Site custom background applies to `body` only. Do not set `main` here: `!important`
		// would override Tailwind `bg-*` on `BodyTemplateWrapper`’s `<main>` (simple/modern/elegant
		// solids). Modern’s gradient used `background-image`, so it still showed — looked “only modern works”.
		if (customColors?.background) {
			cssVars += `body { background-color: ${customColors.background} !important; }\n`;
			cssVars += `html.dark body { background-color: ${customColors.background} !important; }\n`;
		}

		styleElement.textContent = cssVars;
	}

	$: if (browser && $siteConfigData) {
		applyCustomColors();
	}

	// Reapply colors when theme changes (light/dark mode toggle)
	$: if (browser && $resolvedTheme) {
		applyCustomColors();
	}

	onMount(() => {
		if (browser) {
			applyCustomColors();
		}
	});

	onDestroy(() => {
		if (browser) {
			if (styleElement && styleElement.parentNode) {
				styleElement.parentNode.removeChild(styleElement);
			}
			if (googleFontsLink && googleFontsLink.parentNode) {
				googleFontsLink.parentNode.removeChild(googleFontsLink);
			}
		}
	});
</script>
