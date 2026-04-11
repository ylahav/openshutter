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

- **Root:** `<section class="py-20 text-[color:var(--tp-on-brand)]" style="background: linear-gradient(180deg, var(--tp-brand) …)">`
- **Primary button:** `bg-[color:var(--tp-surface-1)] text-[color:var(--tp-brand)]`
- **Secondary button:** `border-2 border-[color:var(--tp-on-brand)] text-[color:var(--tp-on-brand)]`

Pack hooks: adjust `--tp-brand` / `--tp-on-brand` or target this `section` in context.
