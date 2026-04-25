# Language selector (`languageSelector`)

## Purpose

Wraps **`$components/ui/language-selector/LanguageSelector.svelte`**: language dropdown with optional flags and native names.

## Configuration (`props`)

| Parameter | Type | Default | Description |
|-----------|------|---------|-------------|
| `variant` | `'dropdown'` \| `'flags'` | `dropdown` | **flags** = row of flag buttons; **dropdown** = classic menu |
| `showFlags` | boolean | true | Show flag icons |
| `showNativeNames` | boolean | true | Native language labels |
| `compact` | boolean | false | Compact UI |
| `className` | string | — | Passed to underlying component |

See `config.ts`.

## Classes & tokens for template styles

Layout wrapper class:

- `pb-languageSelectorModule`

Inner UI component (`LanguageSelector.svelte`) classes:

- Root: `pb-languageSelector` with modifiers `--dropdown|--flags` and optional `--compact`
- Flags mode: `pb-languageSelector__flagBtn` (+ `--selected|--default|--compact`), `__flag`, `__code`
- Dropdown mode: `pb-languageSelector__trigger`, `__menu`, `__option` (+ `--selected|--default|--compact`), `__check`, `__chevron`

`className` from module config is still appended to the root selector wrapper for pack-specific hooks.
