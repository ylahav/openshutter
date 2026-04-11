# Rich text (`richText`)

## Purpose

WYSIWYG-style content block: optional title plus HTML body; background padding variant for light/gray/transparent bands.

## Configuration (`props`)

| Parameter | Type | Default | Description |
|-----------|------|---------|-------------|
| `title` | MultiLang | — | Optional heading |
| `body` | MultiLang HTML | — | HTML content |
| `background` | `'white'` \| `'gray'` \| `'transparent'` | `'white'` | Padding/background preset |

See `config.ts`.

## Classes & tokens for template styles

- **Root:** `<section>` with `paddingClass` derived from `background` plus `border-[color:var(--tp-border)]` where applicable.
- **Title:** `text-3xl font-bold text-[color:var(--tp-fg)]`
- **Body wrapper:** `prose prose-lg … text-[color:var(--tp-fg-muted)] [&_a]:text-[color:var(--os-primary)]`

No dedicated stable class; scope with parent layout or `:global(.prose)` under your pack.
