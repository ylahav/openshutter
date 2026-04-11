# Feature grid (`featureGrid`)

## Purpose

Responsive grid of feature cards: section title/subtitle and repeating items (icon, title, rich description).

## Configuration (`props`)

| Parameter | Type | Description |
|-----------|------|-------------|
| `title` | MultiLang | Section heading |
| `subtitle` | MultiLang | Section subheading |
| `features` | Array of `{ icon?, title, description }` | Card data |

See `config.ts`.

## Classes & tokens for template styles

- **Root:** `<section class="py-20 bg-[color:var(--tp-surface-2)]">`
- **Cards:** `bg-[color:var(--tp-surface-1)] rounded-xl border border-[color:var(--tp-border)]`
- **Icon well:** uses `--os-primary` and a mixed background from primary + `--tp-surface-2`
- **Typography:** `--tp-fg`, `--tp-fg-muted`; prose links `--os-primary`

No single root BEM class; target `section` context or add pack-specific wrappers via layout shell.
