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

Legacy/global keys (`showTitle`, `cardFieldOrder`, …) remain for older themes.

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
