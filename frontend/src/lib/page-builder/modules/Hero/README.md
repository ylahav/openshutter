# Hero (`hero`)

## Purpose

Large top-of-page banner: title, subtitle, optional CTA, and configurable background (light surface, dark strip, image, or dynamic “gallery leading” photo).

## Configuration (`props`)

| Parameter | Type | Default | Description |
|-----------|------|---------|-------------|
| `title` | MultiLang string / object | — | Main heading |
| `subtitle` | MultiLang | — | Subheading |
| `ctaLabel` | MultiLang | — | Primary button label |
| `ctaUrl` | string | — | Primary button URL |
| `backgroundStyle` | `'light'` \| `'dark'` \| `'image'` \| `'galleryLeading'` | `'light'` | Background mode |
| `backgroundImage` | string (URL) | — | Used when `backgroundStyle === 'image'` |

See also `config.ts` for form metadata.

## Classes & tokens for template styles

- **Root:** `<section>` — dynamic classes include:
  - Dark: `bg-[color:var(--tp-hero-strip-bg)] text-[color:var(--tp-fg)]`
  - Light (default): `bg-[color:var(--tp-surface-2)] text-[color:var(--tp-fg)]`
  - Image / gallery-leading: text uses `--tp-fg`; overlay uses `--tp-overlay-scrim`
- **Inner:** `relative w-full`, flex centering stacks, CTA uses `bg-[color:var(--os-primary)] text-[color:var(--tp-on-brand)]`

**Suggested pack hooks:** target the hero `section` inside your page root or layout shell, e.g. `.layout-shell section` or a wrapper you add via grid placement—not a dedicated `os-hero` class today.
