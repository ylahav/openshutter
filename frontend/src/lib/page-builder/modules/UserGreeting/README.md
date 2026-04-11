# User greeting (`userGreeting`)

## Purpose

Short greeting for authenticated users (name or email).

## Configuration (`props`)

| Parameter | Type | Default | Description |
|-----------|------|---------|-------------|
| `greeting` | string | `'Hello'` | Prefix text |
| `showEmail` | boolean | false | Fall back to email if no display name |
| `className` | string | — | Wrapper text classes |

See `config.ts`.

## Classes & tokens for template styles

- **Root:** `<span class="{className || 'text-[color:var(--tp-fg-muted)]'}">`

Override `className` from theme editor for full control.
