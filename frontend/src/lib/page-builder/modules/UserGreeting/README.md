# User greeting (`userGreeting`)

## Purpose

Short greeting for authenticated users (name or email).

## Configuration (`props`)

| Parameter | Type | Default | Description |
|-----------|------|---------|-------------|
| `greeting` | string | `'Hello'` | Prefix text |
| `showEmail` | boolean | false | Fall back to email if no display name |
| `className` | string | — | Extra classes on the greeting span |

See `config.ts`.

## Classes & tokens for template styles

- **Root:** `pb-userGreeting`; when `className` is empty, `pb-userGreeting--muted` applies (`color: var(--tp-fg-muted)`).

Override `className` from the theme editor for full control.
