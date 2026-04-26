# `ThemeToggle.svelte`

Single control that toggles the site light/dark theme using `resolvedTheme` and `toggleTheme` from `$lib/stores/theme`.

Used by the page builder **`themeToggle`** module and `Header.svelte`.

## Props

- **`variant`**: `'icons'` (default) or `'text'` — sun/moon icons vs. `Light` / `Dark` labels.

## Markup

Root is a `<button>` with sun/moon SVG; uses Tailwind `dark:` variants for hover.

## Import

```ts
import ThemeToggle from '$pageBuilder/primitives/theme-toggle/ThemeToggle.svelte';
```
