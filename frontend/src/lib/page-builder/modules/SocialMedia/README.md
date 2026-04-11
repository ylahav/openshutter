# Social media (`socialMedia`)

## Purpose

Renders platform icons/links (Facebook, Instagram, X/Twitter, LinkedIn) from module props or site-wide social config.

## Configuration (`props`)

| Parameter | Type | Default | Description |
|-----------|------|---------|-------------|
| `socialMedia` | object | — | Per-platform URLs override |
| `iconSize` | `'sm'` \| `'md'` \| `'lg'` | `'md'` | Icon box size |
| `iconColor` | string | `'current'` | Tailwind color token or CSS color |
| `showLabels` | boolean | false | Text labels under icons |
| `orientation` | `'horizontal'` \| `'vertical'` | `'horizontal'` | Flex direction |
| `align` | `'start'` \| `'center'` \| `'end'` | `'start'` | Alignment |
| `gap` | `'tight'` \| `'normal'` \| `'loose'` | `'normal'` | Spacing |
| `className` | string | — | Extra on container |

See `config.ts`.

## Classes & tokens for template styles

- **Root:** `<div class="{containerClass} {className}">` where `containerClass` is built from orientation/align/gap.
- **Row:** `flex items-center {gapClass} hover:opacity-75`
- **Labels:** `text-sm font-medium text-[color:var(--tp-fg-muted)]`

Icon color may use inline `style` when `iconColor` is a CSS value.
