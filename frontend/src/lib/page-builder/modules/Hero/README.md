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

- **Root:** `.pb-hero` with modifiers:
  - `.pb-hero--light`
  - `.pb-hero--dark`
  - `.pb-hero--image`
  - `.pb-hero--fullViewport`
- **Key internals:** `.pb-hero__imageFull`, `.pb-hero__bgImage`, `.pb-hero__overlay`, `.pb-hero__contentWrap`, `.pb-hero__headlineRow`, `.pb-hero__title`, `.pb-hero__subtitle`, `.pb-hero__cta`
- **Tokens:** `--tp-hero-strip-bg`, `--tp-surface-2`, `--tp-overlay-scrim`, `--os-primary`, `--tp-on-brand`
