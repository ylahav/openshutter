<!-- Apply custom theme colors as CSS variables -->
<script lang="ts">
	import { onMount, onDestroy } from 'svelte';
	import { siteConfigData } from '$stores/siteConfig';
	import { resolvedTheme } from '$lib/stores/theme';
	import { browser } from '$app/environment';

	let styleElement: HTMLStyleElement | null = null;

	function applyCustomColors() {
		if (!browser) return;
		
		const config = $siteConfigData;
		const customColors = config?.template?.customColors;
		const customFonts = config?.template?.customFonts;
		const customLayout = config?.template?.customLayout;

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

		// Build CSS variables for both light and dark modes
		let cssVars = ':root {\n';
		
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
			if (customFonts.heading) cssVars += `  --os-font-heading: ${customFonts.heading}, sans-serif;\n`;
			if (customFonts.body) cssVars += `  --os-font-body: ${customFonts.body}, sans-serif;\n`;
		}

		if (customLayout) {
			if (customLayout.maxWidth) cssVars += `  --os-max-width: ${customLayout.maxWidth};\n`;
			if (customLayout.containerPadding) cssVars += `  --os-padding: ${customLayout.containerPadding};\n`;
			if (customLayout.gridGap) cssVars += `  --os-gap: ${customLayout.gridGap};\n`;
		}

		cssVars += '}\n';

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
		if (customColors?.background) {
			cssVars += `body, main { background-color: ${customColors.background} !important; }\n`;
			cssVars += `html.dark body, html.dark main { background-color: ${customColors.background} !important; }\n`;
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
		if (browser && styleElement && styleElement.parentNode) {
			styleElement.parentNode.removeChild(styleElement);
		}
	});
</script>
