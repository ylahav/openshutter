# Hero (`hero`)

## Purpose

Top-of-page banner: optional **background image**, optional **copy** (title, subtitle, description, two buttons), and optional **photo strip** (gallery-leading fetch or explicit URLs). Layout (content vs media order, stacked, content-only, media-only) is **CSS-driven** via `data-*` attributes on the root `<section>`.

See **`config.ts`** for the admin form; **`hero-layout.ts`** normalizes **legacy** props (`heroLayout`, `backgroundStyle`, `heroImages`, `ctaLabel` / `ctaUrl`, etc.) so older themes keep working.

## Markup (visitor)

Stable structure:

- **`section.hero`** — optional modifier **`hero--has-bg`** when a background image is set.
- **`img.hero-img`** — full-bleed background (when present).
- **`div.hero-inner`** — grid for **`div.hero-content`** (text + actions) and **`div.hero-media`** (strip / carousel).

`data-content-media-order` is one of: `content-first`, `media-first`, `stacked`, `content-only`, `media-only`.  
`data-media-arrangement`: `square` | `masonry` | `carousel`.  
`data-media-source`: `galleryLeading` | `uploads`.  
Legacy pack hooks may still set **`data-hero-layout`** (e.g. from `heroLayout` / `layoutVariant`) for template SCSS.

## Configuration (`props`, summary)

| Parameter | Notes |
|-----------|--------|
| `title`, `subtitle`, `description` | MultiLang; optional — omitted when empty. |
| `buttonLabel` / `buttonUrl`, `button2Label` / `button2Url` | Primary/secondary CTA; optional. |
| `backgroundImage` | URL or upload (site asset). |
| `contentMediaOrder` | Row order, stack, or hide one side. |
| `mediaMaxCount` | Cap on strip photos (1–12). |
| `mediaSource` | `galleryLeading` or uploads list. |
| `mediaImages` | Newline-separated URLs when source is uploads. |
| `mediaArrangement` | `square`, `masonry`, `carousel` (when count > 1). |
| `carouselIntervalMs` | Carousel timing (also accepts legacy `slideshowIntervalMs`). |

Gallery-leading fetch uses published photos (prefer **`isGalleryLeading`**, then **`isLeading`**). Home SSR can prefetch leading URLs when needed (see `routes/+page.ts` and **`heroNeedsGalleryLeadingPrefetch`** / **`heroGalleryLeadingMediaLimit`** in **`hero-layout.ts`**).

## Classes & tokens for template styles

- **Root:** `.hero`, `.hero--has-bg`, `.hero-inner`, `.hero-content`, `.hero-media`, `.hero-img`, `.hero-title`, `.hero-subtitle`, `.hero-description`, `.hero-actions`, `.hero-btn`, carousel/dot hooks under `.hero-media__*`.
- **Base CSS:** `modules/Hero/_hero.scss` (loaded via **`modules/styles/_index.scss`**).
- **Pack overrides:** `templates/<pack>/styles/_hero.scss`, loaded after the pack stylesheet via **`loadPackPageBuilderPartials`** where configured.

Older docs referred to **`pb-hero`** and per-layout BEM trees; the current visitor DOM uses **`hero*`** classes above. Prefer those selectors in new SCSS.
