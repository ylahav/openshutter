# Theme toggle (`themeToggle`)

## Purpose

Wraps **`$components/ui/theme-toggle/ThemeToggle.svelte`**: one button toggling light/dark resolved theme.

## Configuration (`props`)

None for the page-builder module (empty `props`).

## Classes & tokens for template styles

Defined on the **inner button** in `ThemeToggle.svelte`:

- `class="p-2 rounded-md hover:bg-black/10 dark:hover:bg-white/10 transition-colors"`
- Icon: `w-5 h-5 text-current`

Target `button` inside the layout region, e.g. `.layout-shell button[aria-label="Toggle theme"]` or add a wrapper class in the pack if you fork the component.
