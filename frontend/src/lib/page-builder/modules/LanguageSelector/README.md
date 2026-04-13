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

Layout passes `className` through. Inner markup/classes are defined on **`LanguageSelector.svelte`** (buttons, menu, flags). Use pack `:global()` rules under `.layout-shell` or inspect that component for current class names.
