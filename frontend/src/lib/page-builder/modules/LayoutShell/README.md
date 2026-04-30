# Layout region (`layoutShell`)

## Purpose

**Named grid** stored in `template.layoutPresets[presetKey]`: rows/columns and inner modules (logo, menu, etc.). Renders a nested `PageBuilderGrid` full-bleed—typical for header/footer bands. Same preset key can be reused on multiple pages.

## Configuration (`props`)

| Parameter | Type | Description |
|-----------|------|-------------|
| `presetKey` | string | Key into `layoutPresets` (required) |

Grid dimensions and inner `modules[]` are edited in the theme **layout preset** UI, not on this module’s props alone.

### Advanced row/cell layout in preset JSON

Inside the shared layout instance object (`layoutShellInstances` / `layoutPresets`), you can also define:

- `rowTemplateColumnsByRow`: per-row `grid-template-columns` map  
  Example: `{ "0": "1-3-1", "1": "auto 1fr auto" }`  
  (`1-3-1` shorthand is normalized to `1fr 3fr 1fr`)
- `cellPlacementByCell`: per-cell alignment map keyed by `"row:col"`  
  Example:
  `{ "0:0": { "horizontal": "start", "vertical": "center" }, "0:2": { "horizontal": "end", "vertical": "end" } }`

Supported placement values: `start` / `center` / `end` / `stretch` (plus default behavior).

### Where to edit in admin

- **Pages editor**: open a `layoutShell` module and click **Edit this instance** to set:
  - **Row templates** (per-row columns template)
  - **Cell alignment** (`row`, `column`, `H align`, `V align`)
- **Template Overrides editor**: the same fields are available under the `layoutShell` instance editor.

## Classes & tokens for template styles

- **Stable:** **`layout-shell pb-layoutShell`** on `<section>`
- **Data attribute:** **`data-layout-preset="{presetKey}"`** — best hook for pack SCSS

```scss
.layout-shell[data-layout-preset='site_header'] {
  background: var(--tp-surface-1);
  border-bottom: 1px solid var(--tp-border);
}
```

- **Errors / empty (admin):** `pb-layoutShell__notice` with modifiers `--warning` / `--muted`

Inner modules use the same tokens as their own READMEs; nesting increments `pbNestDepth` (max depth guard).

**Implementation file:** `../LayoutShellModule.svelte` (this folder is documentation-only).
