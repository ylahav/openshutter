# `LanguageSelector.svelte`

Dropdown for choosing the active site language. Options come from **`siteConfigData.languages.activeLanguages`** intersected with `SUPPORTED_LANGUAGES`.

Used by the page builder **`languageSelector`** module and `Header.svelte`.

## Props

| Prop | Type | Default | Description |
|------|------|---------|-------------|
| `className` | string | `''` | Extra classes on the root wrapper |
| `showFlags` | boolean | `true` | Show flag emoji per language |
| `showNativeNames` | boolean | `true` | Prefer native names in labels |
| `compact` | boolean | `false` | Smaller text in trigger and list |

## Behavior

Fixed-position dropdown aligned to the trigger; repositioned on scroll/resize. Uses `setLanguage` from `$stores/language`.

## Import

```ts
import LanguageSelector from '$components/ui/language-selector/LanguageSelector.svelte';
```
