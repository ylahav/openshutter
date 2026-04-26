# Logo (`logo`)

## Purpose

Renders the site logo from config, or a styled **camera** fallback icon when no image is set.

## Configuration (`props`)

| Parameter | Type | Default | Description |
|-----------|------|---------|-------------|
| `size` | `'sm'` \| `'md'` \| `'lg'` | `'md'` | Logo size modifier (`pb-logo__media--*`) |
| `fallbackIcon` | boolean | true | Show placeholder when logo URL missing |
| `showSiteTitle` | boolean | false | Show the site title text next to the logo |
| `titlePosition` | `'above'` \| `'below'` \| `'right'` \| `'left'` | `'right'` | Title position relative to logo |

See `config.ts`.

## Classes & tokens for template styles

- **Root:** `.pb-logo`
- **Optional link wrapper:** `.pb-logo__link`
- **Brand row/stack wrapper:** `.pb-logo__brand` + `.pb-logo__brand--above|below|right|left`
- **Media:** `.pb-logo__media` + size modifiers `.pb-logo__media--sm|md|lg`
- **Fallback:** `.pb-logo__fallback`, icon `.pb-logo__fallbackIcon`
- **Optional title:** `.pb-logo__title`
- **Token:** fallback background uses `--os-primary` (with `#3B82F6` fallback)
- **Stylesheet resolution:** base styles are in `Logo/_styles.scss`; if `src/templates/<pack>/styles/_logo.scss` exists, it is loaded for that pack and can override defaults.
