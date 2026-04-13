# Hero (`hero`)

## Purpose

Large top-of-page banner: title, subtitle, optional CTA, and configurable background (light surface, dark strip, image, or dynamic “gallery leading” photo).

## Configuration (`props`)

| Parameter | Type | Default | Description |
|-----------|------|---------|-------------|
| `title` | MultiLang string / object | — | Main heading |
| `subtitle` | MultiLang | — | Subheading |
| `showCta` | boolean | `true` | When `false`, title/subtitle only; no button (ignores `ctaLabel` / `ctaUrl` for display). |
| `ctaLabel` | MultiLang | — | Primary button label (if `showCta` and URL set). |
| `ctaUrl` | string | — | Primary button URL. |
| `backgroundStyle` | `'light'` \| `'dark'` \| `'image'` \| `'galleryLeading'` | `'light'` | **`image`** = custom URL via `backgroundImage`. **`galleryLeading`** = featured library photo (no URL). |
| `backgroundImage` | string (URL) | — | **Only** when `backgroundStyle === 'image'`. Not used for `galleryLeading`. |

See also `config.ts` for form metadata.

### Gallery leading background

Uses `GET /api/photos/gallery-leading?limit=1`. The backend returns **published** photos, newest first:

1. Prefer **`isGalleryLeading: true`** (“Gallery Leading (homepage hero)” on the photo in admin/owner).
2. If none, fall back to **`isLeading: true`** (“Album Cover Photo”) so the hero still works when only the cover checkbox is set.

If a photo is unpublished, it will not appear until **Published** is checked.

Image URLs are resolved with **`getPhotoFullUrl`** so storage paths become browser-loadable **`/api/storage/serve/...`** URLs (same as the rest of the app). Fetch runs when `backgroundStyle` is `galleryLeading` after the client is active (not only on first mount), so props that hydrate late still load the photo.

## Classes & tokens for template styles

- **Root:** `<section>` — dynamic classes include:
  - Dark: `bg-[color:var(--tp-hero-strip-bg)] text-[color:var(--tp-fg)]`
  - Light (default): `bg-[color:var(--tp-surface-2)] text-[color:var(--tp-fg)]`
  - Image / gallery-leading: text uses `--tp-fg`; overlay uses `--tp-overlay-scrim`
- **Inner:** `relative w-full`, flex centering stacks, CTA uses `bg-[color:var(--os-primary)] text-[color:var(--tp-on-brand)]`

**Suggested pack hooks:** target the hero `section` inside your page root or layout shell, e.g. `.layout-shell section` or a wrapper you add via grid placement—not a dedicated `os-hero` class today.
