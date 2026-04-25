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

- **Root:** `.pb-featureGrid`
- **Inner/header/grid:** `.pb-featureGrid__inner`, `.pb-featureGrid__header`, `.pb-featureGrid__grid`
- **Cards:** `.pb-featureGrid__card`
- **Icon well:** uses `--os-primary` and a mixed background from primary + `--tp-surface-2`
- **Typography:** `--tp-fg`, `--tp-fg-muted`; body links `--os-primary`
