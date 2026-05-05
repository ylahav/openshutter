# Album view (`albumView`)

## Purpose

Primary album browser: sub-albums, photos, or both; optional album header (title, description, stats); highly configurable card layouts and sorting.

## Configuration (`props`)

See **`config.ts`** for the full field list. Highlights:

| Area | Keys (examples) |
|------|-----------------|
| Source | `albumSource`, `selectedAlbums`, `cardDataType`, `mixedDisplayMode` |
| Header | `showAlbumPageTitle`, `albumHeaderFieldOrder`, … |
| Cards | `albumCardFieldOrder`, `photoCardFieldOrder`, `coverAspect`, `limit`, `sortBy` |
| Visibility | `showCover`, `showPhotoCount`, featured badges, descriptions |
| Cell | `className` — optional classes on **`pbModuleCell`** (pack-prefixed per token); use for template partials such as Studio **`_albumsGrid.scss`**. |

Legacy/global keys (`showTitle`, `cardFieldOrder`, …) remain for older themes.

## Option reference (quick guide)

### Cover aspect (`coverAspect`)

Controls the media frame ratio used when no style-specific override applies.

- `video` (default): wide frame, good for cinematic hero-like covers.
- `square`: 1:1 frame, denser and uniform grid feel.
- `portrait`: tall frame, editorial/portrait-heavy look.

Mini visual:

```text
video      square     portrait
┌────────┐ ┌──────┐   ┌─────┐
│        │ │      │   │     │
└────────┘ └──────┘   │     │
                      └─────┘
```

Notes:
- Some card/grid variants intentionally override aspect (for consistent design language).
- See `AlbumGallery/Layout.svelte` for final aspect resolution.

### Album card layout (`albumCardLayout`)

Controls album card composition flow (not the visual skin).

- `stack` (default): image on top, text/details below.
- `row`: image/thumbnail beside text, one card per row.

Mini visual:

```text
stack                row
┌──────────┐         ┌──────┬──────────────┐
│  image   │         │ img  │ title        │
├──────────┤         │      │ description  │
│ title    │         │      │ meta         │
│ desc     │         └──────┴──────────────┘
└──────────┘
```

### Album card style (`albumCard`)

Visual preset for album cards.

- `auto` (default): resolves from module -> theme -> pack defaults.
- `bare`: minimal/no-chrome style (`bareSquare` internally), common in Noir.
- `cards`: rounded card container style (`roundedCard`), common in Studio.
- `list`: editorial row/list style (`editorialList`), default feel for Atelier.
- `portrait`: portrait-forward cards (`portraitGrid`).
- `overlay`: always-on text overlay on image (`permanentOverlay`).
- `compact`: tighter list/card density (`compactList`).

Mini visual:

```text
bare/cards/list/portrait/overlay/compact
┌image┐  ┌card┐  ┌img|txt┐  ┌tall┐  ┌image+txt┐  ┌small row┐
└─────┘  └────┘  └───────┘  └────┘  └─────────┘  └─────────┘
```

### Photo grid style (`photoCard`)

Visual preset for photo cards/grid behavior.

- `auto` (default): resolves from module -> theme -> pack default.
- `default`: base photo card rendering.
- `square-tight`: tight square tiles.
- `landscape`: 4:3 landscape tiles (`landscape43`).
- `portrait`: 3:4 portrait tiles (`portrait34`).
- `masonry`: masonry flow with uneven heights.
- `justified`: justified rows (row JS layout), image widths adjust per row.
- `large-preview`: emphasizes a larger preview item + supporting items.

Mini visual:

```text
square-tight   landscape     portrait      masonry
┌──┬──┬──┐     ┌────┬────┐   ┌─┬─┬─┐      ┌──┬────┬─┐
├──┼──┼──┤     └────┴────┘   │ │ │ │      │  │    │ │
└──┴──┴──┘                   └─┴─┴─┘      └──┴────┴─┘

justified                          large-preview
┌──────┬───┬────┐                  ┌──────────────┬───┐
└───┬──────┬───┘                  │    HERO      │   │
    └───┬──────┘                  └──────────────┴───┘
```

### Auto-resolution behavior (important)

When set to `auto`:
- Album style resolves via `resolveAlbumCardVariant(...)`:
  module prop -> theme `template.albumCard` -> pack/layout fallback.
- Photo grid style resolves via `resolvePhotoGridVariant(...)`:
  module prop -> theme `template.photoCard` -> pack fallback.

For exact mapping, see `card-layout.ts`.

## Classes & tokens for template styles

- **Root:** `.pb-albumGallery` (`albumView` and `albumsGrid` share `AlbumGallery/Layout.svelte`)
- **Shell:** `.pb-albumGallery__container`
- **Intro:** `.pb-albumGallery__intro`, `.pb-albumGallery__title`, `.pb-albumGallery__description`
- **Lists:** `.pb-albumGallery__list`, modifiers `--row`, `--grid`, `--photos`
- **Cover aspect (passed to cards):** `.pb-albumGallery__aspect--square` | `--portrait` | `--video`
- **Current album header (no hero):** `.pb-albumGallery__pageHeaderWrap`, `.pb-albumGallery__pageHeaderCard`, `.pb-albumGallery__pageTitle`, …
- **Empty / loading:** `.pb-albumGallery__empty`, `.pb-albumGallery__loading`, `.pb-albumGallery__spinner`
- **Tokens:** `--tp-surface-*`, `--tp-fg`, `--tp-fg-muted`, `--tp-border`, `--os-primary`

Pack hooks: scope under `.layout-shell` or a layout-shell `className` wrapper as needed.
