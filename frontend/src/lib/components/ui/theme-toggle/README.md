# `ThemeToggle.svelte`

Single control that toggles the site light/dark theme using `resolvedTheme` and `toggleTheme` from `$lib/stores/theme`.

Used by the page builder **`themeToggle`** module and `Header.svelte`.

## Props

None.

## Markup

Root is a `<button>` with sun/moon SVG; uses Tailwind `dark:` variants for hover.

## Import

```ts
import ThemeToggle from '$components/ui/theme-toggle/ThemeToggle.svelte';
```
