# Call to action (`cta`)

## Purpose

Centered marketing band: title, description, primary + optional secondary button on a **brand gradient** background.

## Configuration (`props`)

| Parameter | Type | Default | Description |
|-----------|------|---------|-------------|
| `title` | MultiLang | — | Heading |
| `description` | MultiLang | — | Supporting text |
| `primaryLabel` | MultiLang | `'Get Started'` | Primary CTA label |
| `primaryHref` | string | `'/'` | Primary URL |
| `secondaryLabel` | MultiLang | — | Optional second button |
| `secondaryHref` | string | — | Secondary URL |

See `config.ts`.

## Classes & tokens for template styles

- **Root:** `.pb-cta` (gradient background is still inline style from config tokens)
- **Inner/title/description:** `.pb-cta__inner`, `.pb-cta__title`, `.pb-cta__description`
- **Actions/buttons:** `.pb-cta__actions`, `.pb-cta__button`, `.pb-cta__button--primary`, `.pb-cta__button--secondary`
- **Tokens:** `--tp-brand`, `--tp-on-brand`, `--tp-surface-1`, `--tp-surface-3`
