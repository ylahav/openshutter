# Login form (`loginForm`)

## Purpose

Full **login page** UI: email/password, errors, template-specific chrome via `LoginTemplateSwitcher.svelte` (pack-aware layout).

## Configuration (`props`)

None for the page-builder module itself.

## Classes & tokens for template styles

Markup and classes live in **`$lib/components/LoginTemplateSwitcher.svelte`** (forms, headings, links). Common tokens in that file:

- `--tp-fg`, `--tp-fg-muted`, `--tp-fg-subtle`
- `--os-font-body`, `--os-font-heading`

Pack-specific branches use `compactLoginChrome` for noir/atelier. Override via template pack SCSS targeting the login route wrapper or `:global` rules scoped to your pack’s login template.

**Implementation file:** `../LoginFormModule.svelte` (this folder is documentation-only).
