# Layout region (`layoutShell`)

## Purpose

**Named grid** stored in `template.layoutPresets[presetKey]`: rows/columns and inner modules (logo, menu, etc.). Renders a nested `PageBuilderGrid` full-bleed—typical for header/footer bands. Same preset key can be reused on multiple pages.

## Configuration (`props`)

| Parameter | Type | Description |
|-----------|------|-------------|
| `presetKey` | string | Key into `layoutPresets` (required) |

Grid dimensions and inner `modules[]` are edited in the theme **layout preset** UI, not on this module’s props alone.

## Classes & tokens for template styles

- **Stable:** **`layout-shell`** on `<section>`
- **Data attribute:** **`data-layout-preset="{presetKey}"`** — best hook for pack SCSS

```scss
.layout-shell[data-layout-preset='site_header'] {
  background: var(--tp-surface-1);
  border-bottom: 1px solid var(--tp-border);
}
```

- **Errors / empty (admin):** dashed border utility boxes (see `LayoutShellModule.svelte`)

Inner modules use the same tokens as their own READMEs; nesting increments `pbNestDepth` (max depth guard).

**Implementation file:** `../LayoutShellModule.svelte` (this folder is documentation-only).
