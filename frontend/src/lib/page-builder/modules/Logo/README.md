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

- **Root:** `.pb-logo`
- **Optional link wrapper:** `.pb-logo__link`
- **Media:** `.pb-logo__media` + size modifiers `.pb-logo__media--sm|md|lg`
- **Fallback:** `.pb-logo__fallback`, icon `.pb-logo__fallbackIcon`
- **Token:** fallback background uses `--os-primary` (with `#3B82F6` fallback)
