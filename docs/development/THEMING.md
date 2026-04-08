# Theming

High-level page builder and theme seeding is documented in **[`TEMPLATING.md`](./TEMPLATING.md) — Part II**.

This page documents **semantic template tokens** used by packs such as Noir so colors and fonts come from **Admin → Template overrides** (`site_config.template.customColors` / `customFonts`), not hard-coded hex in components.

## CSS variables

| Variable | Meaning |
|----------|---------|
| `--tp-canvas` | Page background |
| `--tp-fg` | Primary text |
| `--tp-fg-muted` | Secondary text |
| `--tp-fg-subtle` | Tertiary / labels |
| `--tp-surface-1` … `--tp-surface-3` | Elevated surfaces (cards, tiles) |
| `--tp-border` | Hairline borders |
| `--tp-overlay-scrim` | Overlays (fixed; not from editor) |
| `--tp-hero-grid-opacity` | Hero grid (fixed) |
| `--tp-hero-strip-bg` | Dark hero band (Studio, etc.) — optional `heroStrip` / `lightHeroStrip` |
| `--tp-footer-strip-bg` | Matching footer band — optional `footerStrip` / `lightFooterStrip` |

`ThemeColorApplier` injects these from `buildTemplatePaletteCss()` in `frontend/src/lib/theme/template-palette.ts`. Values follow **`html.light`** vs **`html.dark`** (visitor theme).

**Font roles** from the template editor become `--os-font-heading`, `--os-font-body`, `--os-font-links`, `--os-font-lists`, `--os-font-form-inputs`, `--os-font-form-labels` (see `ThemeColorApplier.svelte`).

## Editor field → token mapping (core)

| `customColors` key | Drives |
|--------------------|--------|
| `background` | Dark canvas → `--tp-canvas` in `html.dark` |
| `text` | Dark primary text → `--tp-fg` |
| `muted` | Dark secondary text → `--tp-fg-muted` |
| `primary`, `secondary`, `accent` | Also exposed as `--os-primary` / Tailwind primary (unchanged) |

Extended keys (`surfaceCard`, `lightBackground`, …) are listed in **`EXTENDED_COLOR_FIELD_META`** in `template-palette.ts` with human-readable labels in the admin UI.

## Pack defaults (JSON)

Noir can ship defaults in `frontend/src/lib/templates/noir/theme.defaults.json` for documentation or tooling; runtime values still come from site config / theme row once applied.
