# `ThemeToggle.svelte`

Single control that toggles the site light/dark theme using `resolvedTheme` and `toggleTheme` from `$lib/stores/theme`.

Used by the page builder **`themeToggle`** module and `Header.svelte`.

## Props

- **`variant`**: `'icons'` (default), `'text'`, or `'both'` — icons only, `Light` / `Dark` labels, or icon + label.

## Styling

Markup uses **`pb-themeToggle*`** class hooks only. Base styles: **`primitives/theme-toggle/_theme-toggle.scss`** (pulled in via `modules/styles/_index.scss` → global template CSS). Packs override in their SCSS (e.g. `templates/<pack>/styles/_themeToggle.scss`).

## Import

```ts
import ThemeToggle from '$pageBuilder/primitives/theme-toggle/ThemeToggle.svelte';
```
