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

- **Root:** `.pb-siteTitle`
- **Link:** `.pb-siteTitle__link` (inherits title font/size/weight/color)
- **Interaction:** hover opacity, keyboard focus outline using `--os-primary`
- **Tokens:** `--tp-fg`, `--os-font-heading`, `--os-primary`
