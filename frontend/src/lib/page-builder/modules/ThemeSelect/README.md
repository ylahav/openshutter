# Theme select (`themeSelect`)

## Purpose

Wraps **`$components/ui/template-selector/TemplateSelector.svelte`** so visitors can pick among published gallery themes when enabled.

## Configuration (`props`)

| Parameter | Type | Default | Description |
|-----------|------|---------|-------------|
| `compact` | boolean | false | Compact layout |
| `className` | string | — | Extra classes on the selector |

See `config.ts`.

## Classes & tokens for template styles

- **Module wrapper:** `pb-themeSelectModule` around **`TemplateSelector`**.
- **Selector root:** `pb-templateSelector` + pass-through `className`. Inner structure uses `pb-templateSelector__*` (trigger, dropdown, options, badges). Override from pack SCSS with `:global(.pb-templateSelector …)` if needed.
