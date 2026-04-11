# Logo (`logo`)

## Purpose

Renders the site logo from config, or a styled **camera** fallback icon when no image is set.

## Configuration (`props`)

| Parameter | Type | Default | Description |
|-----------|------|---------|-------------|
| `size` | `'sm'` \| `'md'` \| `'lg'` | `'md'` | Logo dimensions (Tailwind size classes) |
| `fallbackIcon` | boolean | true | Show placeholder when logo URL missing |

See `config.ts`.

## Classes & tokens for template styles

- **Root:** `<div class="flex items-center shrink-0">`
- **Image:** `object-contain` + dynamic `sizeClass`
- **Fallback block:** `rounded-lg … shadow-lg` with inline `background: var(--os-primary, #3B82F6)`

Target `img` or the inner fallback `div` via `.layout-shell` / parent wrappers; no `os-logo` class.
