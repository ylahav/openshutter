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

Pass-through `className`. Detailed structure lives in **`ui/template-selector/TemplateSelector.svelte`** (trigger, list, options). Style via pack `:global()` under a layout parent or extend that component with a stable root class if needed.
