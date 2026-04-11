# Page title (`pageTitle`)

## Purpose

Renders the **current page**’s title/subtitle from route `page` data (multi-language), with optional visibility toggles and alignment—useful when you don’t want the automatic `PageRenderer` title strip.

## Configuration (`props`)

| Parameter | Type | Default | Description |
|-----------|------|---------|-------------|
| `showTitle` | boolean | true | Show `<h1>` when text exists |
| `showSubtitle` | boolean | true | Show `<h2>` when text exists |
| `align` | `'left'` \| `'center'` | `'center'` | Text alignment |

Also accepts **flat** props from the grid spread (`showTitle`, `showSubtitle`, `align`) in addition to `props` (see `PageTitleModule.svelte`).

`data` must include `page` with `title` / `subtitle` for display.

## Classes & tokens for template styles

- **Root:** `<div class="{compact ? 'py-2' : 'py-8'} {align === 'center' ? 'text-center' : 'text-left'} border-b border-[color:var(--tp-border)]">`
- **Title:** `text-3xl @md:text-5xl font-bold text-[color:var(--tp-fg)]`
- **Subtitle:** `text-lg @md:text-2xl font-semibold text-[color:var(--tp-fg-muted)]`

No stable BEM class; scope with parent grid cell or layout shell.

**Implementation file:** `../PageTitleModule.svelte` (this folder is documentation-only).
