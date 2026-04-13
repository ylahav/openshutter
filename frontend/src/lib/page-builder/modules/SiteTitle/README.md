# Site title (`siteTitle`)

## Purpose

Displays the **site name** from config, optionally as a link to `/`.

When **Link to home** is on, the title stays **visually the same** as plain text (heading font, size, color); it does not use the global link font or default link styling. Keyboard focus shows a small outline for accessibility.

## Configuration (`props`)

| Parameter | Type | Default | Description |
|-----------|------|---------|-------------|
| `showAsLink` | boolean | true | Wrap title in `<a href="/">` |

See `config.ts`.

## Classes & tokens for template styles

- **Root:** `span` or link wrapper with `font-semibold text-lg text-[color:var(--tp-fg)]`
- **Link hover:** `hover:opacity-80 transition-opacity`

No dedicated stable class; target via parent (e.g. header layout shell column).
