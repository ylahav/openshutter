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

- **Root:** `<section class="@container py-12 @sm:py-16 @md:py-20 bg-[color:var(--tp-surface-2)] overflow-x-hidden min-w-0">`
- **Inner shell:** `max-w-7xl mx-auto` content column
- **Cards / panels:** `bg-[color:var(--tp-surface-1)]`, `border-[color:var(--tp-border)]`, `rounded-xl`
- **Typography:** `--tp-fg`, `--tp-fg-muted`, links `--os-primary`
- **Loading / empty states:** spinner uses `--tp-border` and `--os-primary`

There is **no** dedicated `os-album-grid` class; target the outer `section` under your route wrapper or `.layout-shell` if needed.
