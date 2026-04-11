# `TemplateSelector.svelte`

Dropdown to pick a **gallery theme** (built-in packs plus custom rows from the API). Loads `/api/admin/themes` when authenticated, otherwise falls back to `/api/themes`.

- **Visitors:** choice is stored in `localStorage` (`preferredTemplate`, `preferredThemeId`) and applies after reload.
- **Admins:** uses `applyThemeById` so the selection updates site config globally (then reload).

Used by the page builder **`themeSelect`** module and `Header.svelte`.

## Props

| Prop | Type | Default | Description |
|------|------|---------|-------------|
| `className` | string | `''` | Extra classes on the root wrapper |
| `compact` | boolean | `false` | Smaller text in the trigger and list |

## Import

```ts
import TemplateSelector from '$components/ui/template-selector/TemplateSelector.svelte';
```
