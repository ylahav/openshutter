# `LanguageSelector.svelte`

Control for choosing the active site language. Options come from **`siteConfigData.languages.activeLanguages`** intersected with `SUPPORTED_LANGUAGES`.

Styling uses **template palette tokens** (`--tp-surface-*`, `--tp-border`, `--tp-fg`, `--tp-fg-muted`, `--os-primary`, etc.) so it matches the pack, not hard-coded gray/blue.

Used by the page builder **`languageSelector`** module and `Header.svelte`.

## Props

| Prop | Type | Default | Description |
|------|------|---------|-------------|
| `variant` | `'dropdown'` \| `'flags'` | `'dropdown'` | **dropdown** — button + list; **flags** — row of flag buttons (or language codes if `showFlags` is false) |
| `className` | string | `''` | Extra classes on the root wrapper |
| `showFlags` | boolean | `true` | Show flag emoji (dropdown and flags variant); if false in **flags** mode, shows ISO codes instead |
| `showNativeNames` | boolean | `true` | Prefer native names in labels (**dropdown** trigger and list; **flags** use `title` / `aria-label`) |
| `compact` | boolean | `false` | Smaller padding and text |

## Behavior

- **dropdown:** Fixed-position panel aligned to the trigger; repositioned on scroll/resize. Uses `setLanguage` from `$stores/language`.
- **flags:** One button per language; the active language has a ring/accent using `--os-primary`. No dropdown.

## Site header

`Header.svelte` reads **`template.headerConfig.languageSelectorVariant`**: set to `'flags'` for the flag row in the default header (alongside `showLanguageSelector`).

## Import

```ts
import LanguageSelector from '$pageBuilder/primitives/language-selector/LanguageSelector.svelte';
```
