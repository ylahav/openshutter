# Theme toggle (`themeToggle`)

## Purpose

Wraps **`$pageBuilder/primitives/theme-toggle/ThemeToggle.svelte`**: one button toggling light/dark resolved theme.

## Configuration (`props`)

None for the page-builder module (empty `props`).

## Classes & tokens for template styles

Default CSS lives in **`primitives/theme-toggle/_theme-toggle.scss`** (imported from `modules/styles/_index.scss` into global template CSS), not in the Svelte file.

Layout wrapper class:

- `pb-themeToggleModule`

Inner UI component (`ThemeToggle.svelte`) classes:

- Root button: `pb-themeToggle` + modifier `pb-themeToggle--icons|text|both`
- Icon: `pb-themeToggle__icon`

Target these classes directly in pack SCSS (override the base layer).
